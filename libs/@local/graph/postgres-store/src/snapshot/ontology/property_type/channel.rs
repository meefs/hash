use alloc::sync::Arc;
use core::{
    pin::Pin,
    task::{Context, Poll, ready},
};

use error_stack::{Report, ResultExt as _};
use futures::{
    Sink, SinkExt as _, Stream, StreamExt as _,
    channel::mpsc::{self, Receiver, Sender},
    stream::{BoxStream, SelectAll, select_all},
};
use type_system::{
    Validator as _,
    ontology::{
        data_type::DataTypeUuid,
        property_type::{PropertyTypeUuid, schema::PropertyTypeValidator},
    },
};

use crate::{
    snapshot::{
        SnapshotRestoreError,
        ontology::{
            OntologyTypeMetadataSender, PropertyTypeSnapshotRecord, metadata::OntologyTypeMetadata,
            property_type::batch::PropertyTypeRowBatch,
        },
    },
    store::postgres::query::rows::{
        PropertyTypeConstrainsPropertiesOnRow, PropertyTypeConstrainsValuesOnRow,
        PropertyTypeEmbeddingRow, PropertyTypeRow,
    },
};

/// A sink to insert [`PropertyTypeSnapshotRecord`]s.
///
/// An `PropertyTypeSender` with the corresponding [`PropertyTypeReceiver`] are created using the
/// [`property_type_channel`] function.
#[derive(Debug, Clone)]
pub struct PropertyTypeSender {
    validator: Arc<PropertyTypeValidator>,
    metadata: OntologyTypeMetadataSender,
    schema: Sender<PropertyTypeRow>,
    constrains_values: Sender<Vec<PropertyTypeConstrainsValuesOnRow>>,
    constrains_properties: Sender<Vec<PropertyTypeConstrainsPropertiesOnRow>>,
}

// This is a direct wrapper around several `Sink<mpsc::Sender>` and `OntologyTypeMetadataSender`
// with error-handling added to make it easier to use. It's taking an `OntologyTypeSnapshotRecord`
// and sending the individual rows to the corresponding sinks.
impl Sink<PropertyTypeSnapshotRecord> for PropertyTypeSender {
    type Error = Report<SnapshotRestoreError>;

    fn poll_ready(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        ready!(self.metadata.poll_ready_unpin(cx))
            .attach_printable("could not poll ontology type sender")?;
        ready!(self.schema.poll_ready_unpin(cx))
            .change_context(SnapshotRestoreError::Read)
            .attach_printable("could not poll schema sender")?;
        ready!(self.constrains_values.poll_ready_unpin(cx))
            .change_context(SnapshotRestoreError::Read)
            .attach_printable("could not poll constrains values edge sender")?;
        ready!(self.constrains_properties.poll_ready_unpin(cx))
            .change_context(SnapshotRestoreError::Read)
            .attach_printable("could not poll constrains properties edge sender")?;

        Poll::Ready(Ok(()))
    }

    fn start_send(
        mut self: Pin<&mut Self>,
        property_type: PropertyTypeSnapshotRecord,
    ) -> Result<(), Self::Error> {
        let schema = (*self.validator)
            .validate(property_type.schema)
            .change_context(SnapshotRestoreError::Validation)?;
        let ontology_id = PropertyTypeUuid::from_url(&schema.id);

        self.metadata
            .start_send_unpin(OntologyTypeMetadata {
                ontology_id: ontology_id.into(),
                record_id: property_type.metadata.record_id,
                ownership: property_type.metadata.ownership,
                temporal_versioning: property_type.metadata.temporal_versioning,
                provenance: property_type.metadata.provenance,
            })
            .attach_printable("could not send metadata")?;

        let values: Vec<_> = schema
            .data_type_references()
            .into_iter()
            .map(|data_type_ref| PropertyTypeConstrainsValuesOnRow {
                source_property_type_ontology_id: ontology_id,
                target_data_type_ontology_id: DataTypeUuid::from_url(&data_type_ref.url),
            })
            .collect();
        if !values.is_empty() {
            self.constrains_values
                .start_send_unpin(values)
                .change_context(SnapshotRestoreError::Read)
                .attach_printable("could not send constrains values edge")?;
        }

        let properties: Vec<_> = schema
            .property_type_references()
            .into_iter()
            .map(|property_type_ref| PropertyTypeConstrainsPropertiesOnRow {
                source_property_type_ontology_id: ontology_id,
                target_property_type_ontology_id: PropertyTypeUuid::from_url(
                    &property_type_ref.url,
                ),
            })
            .collect();
        if !properties.is_empty() {
            self.constrains_properties
                .start_send_unpin(properties)
                .change_context(SnapshotRestoreError::Read)
                .attach_printable("could not send constrains properties edge")?;
        }

        self.schema
            .start_send_unpin(PropertyTypeRow {
                ontology_id,
                schema,
            })
            .change_context(SnapshotRestoreError::Read)
            .attach_printable("could not send schema")?;

        Ok(())
    }

    fn poll_flush(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        ready!(self.metadata.poll_flush_unpin(cx))
            .attach_printable("could not flush ontology type sender")?;
        ready!(self.schema.poll_flush_unpin(cx))
            .change_context(SnapshotRestoreError::Read)
            .attach_printable("could not flush schema sender")?;
        ready!(self.constrains_values.poll_flush_unpin(cx))
            .change_context(SnapshotRestoreError::Read)
            .attach_printable("could not flush constrains values edge sender")?;
        ready!(self.constrains_properties.poll_flush_unpin(cx))
            .change_context(SnapshotRestoreError::Read)
            .attach_printable("could not flush constrains properties edge sender")?;

        Poll::Ready(Ok(()))
    }

    fn poll_close(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        ready!(self.metadata.poll_close_unpin(cx))
            .attach_printable("could not close ontology type sender")?;
        ready!(self.schema.poll_close_unpin(cx))
            .change_context(SnapshotRestoreError::Read)
            .attach_printable("could not close schema sender")?;
        ready!(self.constrains_values.poll_close_unpin(cx))
            .change_context(SnapshotRestoreError::Read)
            .attach_printable("could not close constrains values edge sender")?;
        ready!(self.constrains_properties.poll_close_unpin(cx))
            .change_context(SnapshotRestoreError::Read)
            .attach_printable("could not close constrains properties edge sender")?;

        Poll::Ready(Ok(()))
    }
}

/// A stream to receive [`PropertyTypeRowBatch`]es.
///
/// An `PropertyTypeReceiver` with the corresponding [`PropertyTypeSender`] are created using the
/// [`property_type_channel`] function.
pub struct PropertyTypeReceiver {
    stream: SelectAll<BoxStream<'static, PropertyTypeRowBatch>>,
}

// This is a direct wrapper around the underlying stream, batches the row in chunks, and unifies
// the `Item` into a single enumeration.
impl Stream for PropertyTypeReceiver {
    type Item = PropertyTypeRowBatch;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        self.stream.poll_next_unpin(cx)
    }
}

/// Creates a new [`PropertyTypeSender`] and [`PropertyTypeReceiver`] pair.
///
/// The `chunk_size` parameter is used to batch the rows into chunks of the given size.
pub(crate) fn property_type_channel(
    chunk_size: usize,
    metadata_sender: OntologyTypeMetadataSender,
    embedding_rx: Receiver<PropertyTypeEmbeddingRow<'static>>,
) -> (PropertyTypeSender, PropertyTypeReceiver) {
    let (schema_tx, schema_rx) = mpsc::channel(chunk_size);
    let (constrains_values_tx, constrains_values_rx) = mpsc::channel(chunk_size);
    let (constrains_properties_tx, constrains_properties_rx) = mpsc::channel(chunk_size);

    (
        PropertyTypeSender {
            validator: Arc::new(PropertyTypeValidator),
            metadata: metadata_sender,
            schema: schema_tx,
            constrains_values: constrains_values_tx,
            constrains_properties: constrains_properties_tx,
        },
        PropertyTypeReceiver {
            stream: select_all([
                schema_rx
                    .ready_chunks(chunk_size)
                    .map(PropertyTypeRowBatch::Schema)
                    .boxed(),
                constrains_values_rx
                    .ready_chunks(chunk_size)
                    .map(|values| {
                        PropertyTypeRowBatch::ConstrainsValues(
                            values.into_iter().flatten().collect(),
                        )
                    })
                    .boxed(),
                constrains_properties_rx
                    .ready_chunks(chunk_size)
                    .map(|values| {
                        PropertyTypeRowBatch::ConstrainsProperties(
                            values.into_iter().flatten().collect(),
                        )
                    })
                    .boxed(),
                embedding_rx
                    .ready_chunks(chunk_size)
                    .map(PropertyTypeRowBatch::Embeddings)
                    .boxed(),
            ]),
        },
    )
}
