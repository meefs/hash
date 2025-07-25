import type {
  EntityId,
  ProvidedEntityEditionProvenance,
  Timestamp,
  UserId,
  WebId,
} from "@blockprotocol/type-system";
import type { GraphApi } from "@local/hash-graph-client";
import { HashEntity } from "@local/hash-graph-sdk/entity";
import {
  systemEntityTypes,
  systemLinkEntityTypes,
} from "@local/hash-isomorphic-utils/ontology-type-ids";
import type {
  GraphChangeNotification,
  OccurredInEntity,
} from "@local/hash-isomorphic-utils/system-types/graphchangenotification";

import { getWebMachineId } from "./machine-actors.js";

export const createGraphChangeNotification = async (
  context: { graphApi: GraphApi },
  params: {
    changedEntityId: EntityId;
    changedEntityEditionId: Timestamp;
    operation: "create" | "update";
    notifiedUserAccountId: UserId;
  },
) => {
  const { graphApi } = context;

  const {
    changedEntityId,
    changedEntityEditionId,
    operation,
    notifiedUserAccountId,
  } = params;

  const userAuthentication = { actorId: notifiedUserAccountId };

  const webMachineActorId = await getWebMachineId(context, userAuthentication, {
    webId: notifiedUserAccountId,
  }).then((maybeMachineId) => {
    if (!maybeMachineId) {
      throw new Error(
        `Failed to get web machine for user account ID: ${notifiedUserAccountId}`,
      );
    }
    return maybeMachineId;
  });

  const provenance: ProvidedEntityEditionProvenance = {
    actorType: "machine",
    origin: {
      type: "api",
    },
  };

  /**
   * We create the notification entity with the user's web bot, as we know it has the necessary permissions in the user's web
   */
  const notificationEntity = await HashEntity.create<GraphChangeNotification>(
    graphApi,
    { actorId: webMachineActorId },
    {
      draft: false,
      entityTypeIds: [systemEntityTypes.graphChangeNotification.entityTypeId],
      webId: notifiedUserAccountId as WebId,
      properties: {
        value: {
          "https://hash.ai/@h/types/property-type/graph-change-type/": {
            value: operation,
            metadata: {
              dataTypeId:
                "https://blockprotocol.org/@blockprotocol/types/data-type/text/v/1",
            },
          },
        },
      },
      provenance,
    },
  );

  await HashEntity.create<OccurredInEntity>(
    graphApi,
    /**
     * We use the user's authority to create the link to the entity because it might be in a different web, e.g. an org's,
     * and we can't be sure that any single bot has access to both the user's web and the web of the changed entity,
     * which might have been created by e.g. an AI bot that has access to the entity's web but not the user's.
     *
     * Ideally we would have a global bot with restricted permissions across all webs to do this – H-1605
     */
    { actorId: notifiedUserAccountId },
    {
      draft: false,
      entityTypeIds: [systemLinkEntityTypes.occurredInEntity.linkEntityTypeId],
      webId: notifiedUserAccountId as WebId,
      linkData: {
        leftEntityId: notificationEntity.metadata.recordId.entityId,
        rightEntityId: changedEntityId,
      },
      properties: {
        value: {
          "https://hash.ai/@h/types/property-type/entity-edition-id/": {
            value: changedEntityEditionId,
            metadata: {
              dataTypeId:
                "https://blockprotocol.org/@blockprotocol/types/data-type/text/v/1",
            },
          },
        },
      },
      provenance,
    },
  );
};
