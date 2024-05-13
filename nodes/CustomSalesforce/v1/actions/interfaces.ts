import type { AllEntities, Entity, PropertiesOf } from 'n8n-workflow';

type SalesforceMap = {
	user: 'create' | 'getAll' | 'getById';
};

export type Salesforce = AllEntities<SalesforceMap>;

export type SalesforceChannel = Entity<SalesforceMap, 'channel'>;
export type SalesforceMessage = Entity<SalesforceMap, 'message'>;
export type SalesforceReaction = Entity<SalesforceMap, 'reaction'>;
export type SalesforceUser = Entity<SalesforceMap, 'user'>;

export type ChannelProperties = PropertiesOf<SalesforceChannel>;
export type MessageProperties = PropertiesOf<SalesforceMessage>;
export type ReactionProperties = PropertiesOf<SalesforceReaction>;
export type UserProperties = PropertiesOf<SalesforceUser>;

export interface IAttachment {
	fields: {
		item?: object[];
	};
	actions: {
		item?: object[];
	};
}
