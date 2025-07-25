import type { Entity } from "@blockprotocol/type-system";
import { blockProtocolEntityTypes } from "@local/hash-isomorphic-utils/ontology-type-ids";
import { simplifyProperties } from "@local/hash-isomorphic-utils/simplify-properties";
import type { ServiceFeature } from "@local/hash-isomorphic-utils/system-types/shared";

import { logger } from "../../../../logger";
import { createEntity } from "../../../knowledge/primitive/entity";
import { getOrgByShortname } from "../../../knowledge/system-types/org";
import type { MigrationFunction } from "../types";
import {
  createSystemEntityTypeIfNotExists,
  createSystemPropertyTypeIfNotExists,
  getCurrentHashDataTypeId,
  getEntitiesByType,
} from "../util";

const migrate: MigrationFunction = async ({
  context,
  authentication,
  migrationState,
}) => {
  /** Step 1: Create an entity type that describes a chargeable service */
  const serviceNamePropertyType = await createSystemPropertyTypeIfNotExists(
    context,
    authentication,
    {
      propertyTypeDefinition: {
        title: "Service Name",
        description: "The name of a service",
        possibleValues: [{ primitiveDataType: "text" }],
      },
      webShortname: "h",
      migrationState,
    },
  );

  const featureNamePropertyType = await createSystemPropertyTypeIfNotExists(
    context,
    authentication,
    {
      propertyTypeDefinition: {
        title: "Feature Name",
        description: "The name of a feature",
        possibleValues: [{ primitiveDataType: "text" }],
      },
      webShortname: "h",
      migrationState,
    },
  );

  const inputUnitCostPropertyType = await createSystemPropertyTypeIfNotExists(
    context,
    authentication,
    {
      propertyTypeDefinition: {
        title: "Input Unit Cost",
        description: "The cost of an input unit",
        possibleValues: [{ primitiveDataType: "number" }],
      },
      webShortname: "h",
      migrationState,
    },
  );

  const outputUnitCostPropertyType = await createSystemPropertyTypeIfNotExists(
    context,
    authentication,
    {
      propertyTypeDefinition: {
        title: "Output Unit Cost",
        description: "The cost of an output unit",
        possibleValues: [{ primitiveDataType: "number" }],
      },
      webShortname: "h",
      migrationState,
    },
  );

  const datetimeDataTypeVersionedUrl = getCurrentHashDataTypeId({
    dataTypeKey: "datetime",
    migrationState,
  });

  const appliesFromPropertyType = await createSystemPropertyTypeIfNotExists(
    context,
    authentication,
    {
      propertyTypeDefinition: {
        title: "Applies From",
        description: "The point in time at which something begins to apply",
        possibleValues: [{ dataTypeId: datetimeDataTypeVersionedUrl }],
      },
      webShortname: "h",
      migrationState,
    },
  );

  const appliesUntilPropertyType = await createSystemPropertyTypeIfNotExists(
    context,
    authentication,
    {
      propertyTypeDefinition: {
        title: "Applies Until",
        description: "The point at which something ceases to apply",
        possibleValues: [{ dataTypeId: datetimeDataTypeVersionedUrl }],
      },
      webShortname: "h",
      migrationState,
    },
  );

  const serviceUnitCost = await createSystemPropertyTypeIfNotExists(
    context,
    authentication,
    {
      propertyTypeDefinition: {
        title: "Service Unit Cost",
        description: "The unit cost of a service",
        possibleValues: [
          {
            propertyTypeObjectProperties: {
              [inputUnitCostPropertyType.metadata.recordId.baseUrl]: {
                $ref: inputUnitCostPropertyType.schema.$id,
              },
              [outputUnitCostPropertyType.metadata.recordId.baseUrl]: {
                $ref: outputUnitCostPropertyType.schema.$id,
              },
              [appliesFromPropertyType.metadata.recordId.baseUrl]: {
                $ref: appliesFromPropertyType.schema.$id,
              },
              [appliesUntilPropertyType.metadata.recordId.baseUrl]: {
                $ref: appliesUntilPropertyType.schema.$id,
              },
            },
            propertyTypeObjectRequiredProperties: [
              appliesFromPropertyType.metadata.recordId.baseUrl,
            ],
          },
        ],
      },
      webShortname: "h",
      migrationState,
    },
  );

  const serviceFeatureEntityType = await createSystemEntityTypeIfNotExists(
    context,
    authentication,
    {
      entityTypeDefinition: {
        title: "Service Feature",
        titlePlural: "Service Features",
        icon: "/icons/types/plug-circle-check.svg",
        labelProperty: serviceNamePropertyType.metadata.recordId.baseUrl,
        description: "A feature of a service",
        properties: [
          {
            propertyType: serviceNamePropertyType,
            required: true,
          },
          {
            propertyType: featureNamePropertyType,
            required: true,
          },
          {
            propertyType: serviceUnitCost,
            array: true,
          },
        ],
      },
      webShortname: "h",
      migrationState,
    },
  );

  /** Step 2: Create an entity type which records usage of a chargeable service */

  const recordsUsageOfLinkEntityType = await createSystemEntityTypeIfNotExists(
    context,
    authentication,
    {
      entityTypeDefinition: {
        allOf: [blockProtocolEntityTypes.link.entityTypeId],
        title: "Records Usage Of",
        inverse: {
          title: "Usage Recorded By",
        },
        description: "The thing that something records usage of.",
      },
      webShortname: "h",
      migrationState,
    },
  );

  const createdLinkEntityType = await createSystemEntityTypeIfNotExists(
    context,
    authentication,
    {
      entityTypeDefinition: {
        allOf: [blockProtocolEntityTypes.link.entityTypeId],
        title: "Created",
        inverse: {
          title: "Created By",
        },
        description: "The thing that something created.",
      },
      webShortname: "h",
      migrationState,
    },
  );

  const updatedLinkEntityType = await createSystemEntityTypeIfNotExists(
    context,
    authentication,
    {
      entityTypeDefinition: {
        allOf: [blockProtocolEntityTypes.link.entityTypeId],
        title: "Updated",
        inverse: {
          title: "Updated By",
        },
        description: "The thing that something created.",
      },
      webShortname: "h",
      migrationState,
    },
  );

  const inputUnitCountPropertyType = await createSystemPropertyTypeIfNotExists(
    context,
    authentication,
    {
      propertyTypeDefinition: {
        title: "Input Unit Count",
        description: "How many input units were or will be used",
        possibleValues: [{ primitiveDataType: "number" }],
      },
      webShortname: "h",
      migrationState,
    },
  );

  const outputUnitCountPropertyType = await createSystemPropertyTypeIfNotExists(
    context,
    authentication,
    {
      propertyTypeDefinition: {
        title: "Output Unit Count",
        description: "How many output units were or will be used",
        possibleValues: [{ primitiveDataType: "number" }],
      },
      webShortname: "h",
      migrationState,
    },
  );

  await createSystemEntityTypeIfNotExists(context, authentication, {
    entityTypeDefinition: {
      title: "Usage Record",
      titlePlural: "Usage Records",
      icon: "/icons/types/gauge-max.svg",
      description: "A record of usage of a service",
      properties: [
        {
          propertyType: inputUnitCountPropertyType,
        },
        {
          propertyType: outputUnitCountPropertyType,
        },
      ],
      outgoingLinks: [
        {
          linkEntityType: recordsUsageOfLinkEntityType,
          destinationEntityTypes: [serviceFeatureEntityType],
          minItems: 1,
          maxItems: 1,
        },
        {
          linkEntityType: createdLinkEntityType,
        },
        {
          linkEntityType: updatedLinkEntityType,
        },
      ],
    },
    webShortname: "h",
    migrationState,
  });

  /**
   * Step 3: Create the initial Service Feature entities
   */
  const initialServices = [
    /** @see https://openai.com/pricing */
    {
      serviceName: "OpenAI",
      featureName: "gpt-4",
      inputUnitCost: 0.00003,
      outputUnitCost: 0.00006,
    },
    {
      serviceName: "OpenAI",
      featureName: "gpt-3.5-turbo-1106",
      inputUnitCost: 0.000001,
      outputUnitCost: 0.000002,
    },
    {
      serviceName: "OpenAI",
      featureName: "gpt-4-0125-preview",
      inputUnitCost: 0.00001,
      outputUnitCost: 0.00003,
    },
    {
      serviceName: "OpenAI",
      featureName: "gpt-4-turbo",
      inputUnitCost: 0.00001,
      outputUnitCost: 0.00003,
    },
    {
      serviceName: "OpenAI",
      featureName: "gpt-4o-2024-08-06",
      inputUnitCost: 0.0000025,
      outputUnitCost: 0.00001,
    },
    {
      serviceName: "OpenAI",
      featureName: "gpt-4o-mini-2024-07-18",
      inputUnitCost: 0.00000015,
      outputUnitCost: 0.00000016,
    },
    /** @see https://www.anthropic.com/api */
    {
      serviceName: "Anthropic",
      featureName: "claude-3-opus-20240229",
      inputUnitCost: 0.000015,
      outputUnitCost: 0.000075,
    },
    {
      serviceName: "Anthropic",
      featureName: "claude-3-5-sonnet-20240620",
      inputUnitCost: 0.000003,
      outputUnitCost: 0.000015,
    },
    {
      serviceName: "Anthropic",
      featureName: "claude-3-haiku-20240307",
      inputUnitCost: 0.00000025,
      outputUnitCost: 0.00000125,
    },
    {
      serviceName: "Google AI",
      featureName: "gemini-1.5-pro-002",
      inputUnitCost: 0.00000125,
      outputUnitCost: 0.000005,
    },
  ];

  const hashOrg = await getOrgByShortname(context, authentication, {
    shortname: "h",
  });
  if (!hashOrg) {
    throw new Error(
      "Org with shortname 'h' does not exist by migration 007, but it should.",
    );
  }
  const hashWebId = hashOrg.webId;

  const existingServiceFeatureEntities = (await getEntitiesByType(
    context,
    authentication,
    {
      entityTypeId: serviceFeatureEntityType.schema.$id,
    },
  )) as Entity<ServiceFeature>[];

  for (const {
    serviceName,
    featureName,
    inputUnitCost,
    outputUnitCost,
  } of initialServices) {
    const existingServiceFeatureEntity = existingServiceFeatureEntities.find(
      (entity) => {
        const {
          serviceName: serviceNameProperty,
          featureName: featureNameProperty,
        } = simplifyProperties(entity.properties);

        return (
          serviceNameProperty === serviceName &&
          featureNameProperty === featureName
        );
      },
    );

    if (existingServiceFeatureEntity) {
      logger.debug(
        `Skipping creation of service feature entity for ${serviceName}:${featureName} as it already exists`,
      );
      continue;
    }

    logger.info(
      `Creating service feature entity for ${serviceName}:${featureName}`,
    );

    await createEntity<ServiceFeature>(context, authentication, {
      entityTypeIds: [
        serviceFeatureEntityType.schema.$id,
      ] as ServiceFeature["entityTypeIds"],
      properties: {
        value: {
          "https://hash.ai/@h/types/property-type/service-name/": {
            value: serviceName,
            metadata: {
              dataTypeId:
                "https://blockprotocol.org/@blockprotocol/types/data-type/text/v/1",
            },
          },
          "https://hash.ai/@h/types/property-type/feature-name/": {
            value: featureName,
            metadata: {
              dataTypeId:
                "https://blockprotocol.org/@blockprotocol/types/data-type/text/v/1",
            },
          },
          "https://hash.ai/@h/types/property-type/service-unit-cost/": {
            value: [
              {
                value: {
                  "https://hash.ai/@h/types/property-type/input-unit-cost/": {
                    value: inputUnitCost,
                    metadata: {
                      dataTypeId:
                        "https://blockprotocol.org/@blockprotocol/types/data-type/number/v/1",
                    },
                  },
                  "https://hash.ai/@h/types/property-type/output-unit-cost/": {
                    value: outputUnitCost,
                    metadata: {
                      dataTypeId:
                        "https://blockprotocol.org/@blockprotocol/types/data-type/number/v/1",
                    },
                  },
                  "https://hash.ai/@h/types/property-type/applies-from/": {
                    value: new Date("2023-12-20").toISOString(),
                    metadata: {
                      dataTypeId:
                        "https://hash.ai/@h/types/data-type/datetime/v/1",
                    },
                  },
                },
              },
            ],
          },
        },
      },
      webId: hashWebId,
    });
  }

  return migrationState;
};

export default migrate;
