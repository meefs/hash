use hash_graph_store::{
    entity_type::{
        CreateEntityTypeParams, EntityTypeStore as _, GetEntityTypesParams, UpdateEntityTypesParams,
    },
    filter::Filter,
    query::ConflictBehavior,
    subgraph::temporal_axes::{
        PinnedTemporalAxisUnresolved, QueryTemporalAxesUnresolved, VariableTemporalAxisUnresolved,
    },
};
use hash_graph_temporal_versioning::TemporalBound;
use hash_graph_test_data::{data_type, entity_type, property_type};
use type_system::{
    ontology::{
        entity_type::EntityType,
        provenance::{OntologyOwnership, ProvidedOntologyEditionProvenance},
    },
    principal::{actor::ActorType, actor_group::WebId},
    provenance::{OriginProvenance, OriginType},
};

use crate::DatabaseTestWrapper;

#[tokio::test]
async fn insert() {
    let person_et: EntityType = serde_json::from_str(entity_type::PERSON_V1)
        .expect("could not parse entity type representation");

    let mut database = DatabaseTestWrapper::new().await;
    let mut api = database
        .seed(
            [
                data_type::VALUE_V1,
                data_type::TEXT_V1,
                data_type::NUMBER_V1,
            ],
            [
                property_type::NAME_V1,
                property_type::AGE_V1,
                property_type::FAVORITE_SONG_V1,
                property_type::FAVORITE_FILM_V1,
                property_type::HOBBY_V1,
                property_type::INTERESTS_V1,
            ],
            [
                entity_type::LINK_V1,
                entity_type::link::FRIEND_OF_V1,
                entity_type::link::ACQUAINTANCE_OF_V1,
            ],
        )
        .await
        .expect("could not seed database");

    api.create_entity_type(
        api.account_id,
        CreateEntityTypeParams {
            schema: person_et,
            ownership: OntologyOwnership::Local {
                web_id: WebId::new(api.account_id),
            },
            conflict_behavior: ConflictBehavior::Fail,
            provenance: ProvidedOntologyEditionProvenance {
                actor_type: ActorType::User,
                origin: OriginProvenance::from_empty_type(OriginType::Api),
                sources: Vec::new(),
            },
        },
    )
    .await
    .expect("could not create entity type");
}

#[tokio::test]
async fn query() {
    let organization_et: EntityType = serde_json::from_str(entity_type::ORGANIZATION_V1)
        .expect("could not parse entity type representation");

    let mut database = DatabaseTestWrapper::new().await;
    let mut api = database
        .seed(
            [data_type::VALUE_V1, data_type::TEXT_V1],
            [property_type::NAME_V1],
            [],
        )
        .await
        .expect("could not seed database");

    api.create_entity_type(
        api.account_id,
        CreateEntityTypeParams {
            schema: organization_et.clone(),
            ownership: OntologyOwnership::Local {
                web_id: WebId::new(api.account_id),
            },
            conflict_behavior: ConflictBehavior::Fail,
            provenance: ProvidedOntologyEditionProvenance {
                actor_type: ActorType::User,
                origin: OriginProvenance::from_empty_type(OriginType::Api),
                sources: Vec::new(),
            },
        },
    )
    .await
    .expect("could not create entity type");

    let entity_type = api
        .get_entity_types(
            api.account_id,
            GetEntityTypesParams {
                filter: Filter::for_versioned_url(&organization_et.id),
                temporal_axes: QueryTemporalAxesUnresolved::DecisionTime {
                    pinned: PinnedTemporalAxisUnresolved::new(None),
                    variable: VariableTemporalAxisUnresolved::new(
                        Some(TemporalBound::Unbounded),
                        None,
                    ),
                },
                include_drafts: false,
                after: None,
                limit: None,
                include_entity_types: None,
                include_count: false,
                include_web_ids: false,
                include_edition_created_by_ids: false,
            },
        )
        .await
        .expect("could not get entity type")
        .entity_types
        .pop()
        .expect("no entity type found");

    assert_eq!(entity_type.schema.id, organization_et.id);
}

#[tokio::test]
#[expect(clippy::too_many_lines)]
async fn update() {
    let page_et_v1: EntityType = serde_json::from_str(entity_type::PAGE_V1)
        .expect("could not parse entity type representation");

    let page_et_v2: EntityType = serde_json::from_str(entity_type::PAGE_V2)
        .expect("could not parse entity type representation");

    let mut database = DatabaseTestWrapper::new().await;
    let mut api = database
        .seed(
            [
                data_type::VALUE_V1,
                data_type::TEXT_V1,
                data_type::NUMBER_V1,
            ],
            [
                property_type::TEXT_V1,
                property_type::NAME_V1,
                property_type::AGE_V1,
                property_type::FAVORITE_SONG_V1,
                property_type::FAVORITE_FILM_V1,
                property_type::HOBBY_V1,
                property_type::INTERESTS_V1,
            ],
            [
                entity_type::LINK_V1,
                entity_type::link::WRITTEN_BY_V1,
                entity_type::link::CONTAINS_V1,
                entity_type::link::FRIEND_OF_V1,
                entity_type::link::ACQUAINTANCE_OF_V1,
                entity_type::PERSON_V1,
                entity_type::BLOCK_V1,
            ],
        )
        .await
        .expect("could not seed database:");

    api.create_entity_type(
        api.account_id,
        CreateEntityTypeParams {
            schema: page_et_v1.clone(),
            ownership: OntologyOwnership::Local {
                web_id: WebId::new(api.account_id),
            },
            conflict_behavior: ConflictBehavior::Fail,
            provenance: ProvidedOntologyEditionProvenance {
                actor_type: ActorType::User,
                origin: OriginProvenance::from_empty_type(OriginType::Api),
                sources: Vec::new(),
            },
        },
    )
    .await
    .expect("could not create entity type");

    api.update_entity_type(
        api.account_id,
        UpdateEntityTypesParams {
            schema: page_et_v2.clone(),
            provenance: ProvidedOntologyEditionProvenance {
                actor_type: ActorType::User,
                origin: OriginProvenance::from_empty_type(OriginType::Api),
                sources: Vec::new(),
            },
        },
    )
    .await
    .expect("could not update entity type");

    let returned_page_et_v1 = api
        .get_entity_types(
            api.account_id,
            GetEntityTypesParams {
                filter: Filter::for_versioned_url(&page_et_v1.id),
                temporal_axes: QueryTemporalAxesUnresolved::DecisionTime {
                    pinned: PinnedTemporalAxisUnresolved::new(None),
                    variable: VariableTemporalAxisUnresolved::new(
                        Some(TemporalBound::Unbounded),
                        None,
                    ),
                },
                include_drafts: false,
                after: None,
                limit: None,
                include_entity_types: None,
                include_count: false,
                include_web_ids: false,
                include_edition_created_by_ids: false,
            },
        )
        .await
        .expect("could not get entity type")
        .entity_types
        .pop()
        .expect("no entity type found");

    let returned_page_et_v2 = api
        .get_entity_types(
            api.account_id,
            GetEntityTypesParams {
                filter: Filter::for_versioned_url(&page_et_v2.id),
                temporal_axes: QueryTemporalAxesUnresolved::DecisionTime {
                    pinned: PinnedTemporalAxisUnresolved::new(None),
                    variable: VariableTemporalAxisUnresolved::new(
                        Some(TemporalBound::Unbounded),
                        None,
                    ),
                },
                include_drafts: false,
                after: None,
                limit: None,
                include_entity_types: None,
                include_count: false,
                include_web_ids: false,
                include_edition_created_by_ids: false,
            },
        )
        .await
        .expect("could not get entity type")
        .entity_types
        .pop()
        .expect("no entity type found");

    assert_eq!(page_et_v1.id, returned_page_et_v1.schema.id);
    assert_eq!(page_et_v2.id, returned_page_et_v2.schema.id);
}
