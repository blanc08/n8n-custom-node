import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	IHttpRequestMethods,
	INodeTypeBaseDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { accountFields, accountOperations } from './actions/account/AccountDescription';

import type { IAccount } from './interfaces/AccountInterface';

import {
	getQuery,
	salesforceApiRequest,
	salesforceApiRequestAllItems,
	sortOptions,
} from './utils/GenericFunctions';

import { attachmentFields, attachmentOperations } from './actions/attachment/AttachmentDescription';
import {
	customObjectFields,
	customObjectOperations,
} from './actions/custom-object/CustomObjectDescription';
import {
	opportunityFields,
	opportunityOperations,
} from './actions/opportunity/OpportunityDescription';
import { searchFields, searchOperations } from './actions/search/SearchDescription';
import { userFields, userOperations } from './actions/user/UserDescription';
import { IAttachment } from './interfaces/AttachmentInterface';
import { IOpportunity } from './interfaces/OpportunityInterface';
import { INote } from './interfaces/NoteInterface';

export class CustomSalesforceV2 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Custom Salesforce V2',
		name: 'customSalesforceV2',
		icon: 'file:salesforce.svg',
		group: ['output'],
		version: 2,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Salesforce API',
		defaults: {
			name: 'Salesforce',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'customSalesforceOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
			{
				name: 'customSalesforceJwtApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['jwt'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
					{
						name: 'OAuth2 JWT',
						value: 'jwt',
					},
				],
				default: 'oAuth2',
				description: 'OAuth Authorization Flow',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Account',
						value: 'account',
						description:
							'Represents an individual account, which is an organization or person involved with your business (such as customers, competitors, and partners)',
					},
					{
						name: 'Attachment',
						value: 'attachment',
						description: 'Represents a file that a has uploaded and attached to a parent object',
					},
					{
						name: 'Case',
						value: 'case',
						description: 'Represents a case, which is a customer issue or problem',
					},
					{
						name: 'Contact',
						value: 'contact',
						description: 'Represents a contact, which is an individual associated with an account',
					},
					{
						name: 'Custom Object',
						value: 'customObject',
						description: 'Represents a custom object',
					},
					{
						name: 'Document',
						value: 'document',
						description: 'Represents a document',
					},
					{
						name: 'Flow',
						value: 'flow',
						description: 'Represents an autolaunched flow',
					},
					{
						name: 'Lead',
						value: 'lead',
						description: 'Represents a prospect or potential',
					},
					{
						name: 'Opportunity',
						value: 'opportunity',
						description: 'Represents an opportunity, which is a sale or pending deal',
					},
					{
						name: 'Search',
						value: 'search',
						description: 'Search records',
					},
					{
						name: 'Task',
						value: 'task',
						description:
							'Represents a business activity such as making a phone call or other to-do items. In the user interface, and records are collectively referred to as activities.',
					},
					{
						name: 'User',
						value: 'user',
						description: 'Represents a person, which is one user in system',
					},
				],
				default: 'lead',
			},
			...customObjectOperations,
			...customObjectFields,
			...opportunityOperations,
			...opportunityFields,
			...accountOperations,
			...accountFields,
			...searchOperations,
			...searchFields,
			...attachmentOperations,
			...attachmentFields,
			...userOperations,
			...userFields,
		],
	};

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...this.description,
		};
	}

	methods = {
		loadOptions: {
			// Get all the lead statuses to display them to user so that they can
			// select them easily
			async getLeadStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs = {
					q: 'SELECT id, MasterLabel FROM LeadStatus',
				};
				const statuses = await salesforceApiRequestAllItems.call(
					this,
					'records',
					'GET',
					'/query',
					{},
					qs,
				);
				for (const status of statuses) {
					const statusName = status.MasterLabel;
					returnData.push({
						name: statusName,
						value: statusName,
					});
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the users to display them to user so that they can
			// select them easily
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs = {
					q: 'SELECT id, Name FROM User',
				};
				const users = await salesforceApiRequestAllItems.call(
					this,
					'records',
					'GET',
					'/query',
					{},
					qs,
				);
				for (const user of users) {
					const userName = user.Name;
					const userId = user.Id;
					returnData.push({
						name: userName,
						value: userId,
					});
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the users and case queues to display them to user so that they can
			// select them easily
			async getCaseOwners(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qsQueues = {
					q: "SELECT Queue.Id, Queue.Name FROM QueuesObject where Queue.Type='Queue' and SobjectType = 'Case'",
				};
				const queues = await salesforceApiRequestAllItems.call(
					this,
					'records',
					'GET',
					'/query',
					{},
					qsQueues,
				);
				for (const queue of queues) {
					const queueName = queue.Queue.Name;
					const queueId = queue.Queue.Id;
					returnData.push({
						name: `Queue: ${queueName}`,
						value: queueId,
					});
				}
				const qsUsers = {
					q: 'SELECT id, Name FROM User',
				};
				const users = await salesforceApiRequestAllItems.call(
					this,
					'records',
					'GET',
					'/query',
					{},
					qsUsers,
				);
				const userPrefix = returnData.length > 0 ? 'User: ' : '';
				for (const user of users) {
					const userName = user.Name;
					const userId = user.Id;
					returnData.push({
						name: userPrefix + (userName as string),
						value: userId,
					});
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the users and lead queues to display them to user so that they can
			// select them easily
			async getLeadOwners(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qsQueues = {
					q: "SELECT Queue.Id, Queue.Name FROM QueuesObject where Queue.Type='Queue' and SobjectType = 'Lead'",
				};
				const queues = await salesforceApiRequestAllItems.call(
					this,
					'records',
					'GET',
					'/query',
					{},
					qsQueues,
				);
				for (const queue of queues) {
					const queueName = queue.Queue.Name;
					const queueId = queue.Queue.Id;
					returnData.push({
						name: `Queue: ${queueName}`,
						value: queueId,
					});
				}
				const qsUsers = {
					q: 'SELECT id, Name FROM User',
				};
				const users = await salesforceApiRequestAllItems.call(
					this,
					'records',
					'GET',
					'/query',
					{},
					qsUsers,
				);
				const userPrefix = returnData.length > 0 ? 'User: ' : '';
				for (const user of users) {
					const userName = user.Name;
					const userId = user.Id;
					returnData.push({
						name: userPrefix + (userName as string),
						value: userId,
					});
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the lead sources to display them to user so that they can
			// select them easily
			async getLeadSources(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/lead/describe');

				for (const field of fields) {
					if (field.name === 'LeadSource') {
						for (const pickValue of field.picklistValues) {
							const pickValueName = pickValue.label;
							const pickValueId = pickValue.value;
							returnData.push({
								name: pickValueName,
								value: pickValueId,
							});
						}
					}
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the lead custom fields to display them to user so that they can
			// select them easily
			async getCustomFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const resource = this.getNodeParameter('resource', 0);
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(
					this,
					'GET',
					`/sobjects/${resource}/describe`,
				);
				for (const field of fields) {
					if (field.custom === true) {
						const fieldName = field.label;
						const fieldId = field.name;
						returnData.push({
							name: fieldName,
							value: fieldId,
						});
					}
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the record types to display them to user so that they can
			// select them easily
			async getRecordTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let resource = this.getNodeParameter('resource', 0);
				if (resource === 'customObject') {
					resource = this.getNodeParameter('customObject', 0) as string;
				}
				const qs = {
					q: `SELECT Id, Name, SobjectType, IsActive FROM RecordType WHERE SobjectType = '${resource}'`,
				};
				const types = await salesforceApiRequestAllItems.call(
					this,
					'records',
					'GET',
					'/query',
					{},
					qs,
				);
				for (const type of types) {
					if (type.IsActive === true) {
						returnData.push({
							name: type.Name,
							value: type.Id,
						});
					}
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the external id fields to display them to user so that they can
			// select them easily
			async getExternalIdFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let resource = this.getCurrentNodeParameter('resource') as string;
				resource =
					resource === 'customObject'
						? (this.getCurrentNodeParameter('customObject') as string)
						: resource;
				const { fields } = await salesforceApiRequest.call(
					this,
					'GET',
					`/sobjects/${resource}/describe`,
				);
				for (const field of fields) {
					if (field.externalId === true || field.idLookup === true) {
						const fieldName = field.label;
						const fieldId = field.name;
						returnData.push({
							name: fieldName,
							value: fieldId,
						});
					}
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the accounts to display them to user so that they can
			// select them easily
			async getAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs = {
					q: 'SELECT id, Name FROM Account',
				};
				const accounts = await salesforceApiRequestAllItems.call(
					this,
					'records',
					'GET',
					'/query',
					{},
					qs,
				);
				for (const account of accounts) {
					const accountName = account.Name;
					const accountId = account.Id;
					returnData.push({
						name: accountName,
						value: accountId,
					});
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the campaigns to display them to user so that they can
			// select them easily
			async getCampaigns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs = {
					q: 'SELECT id, Name FROM Campaign',
				};
				const campaigns = await salesforceApiRequestAllItems.call(
					this,
					'records',
					'GET',
					'/query',
					{},
					qs,
				);
				for (const campaign of campaigns) {
					const campaignName = campaign.Name;
					const campaignId = campaign.Id;
					returnData.push({
						name: campaignName,
						value: campaignId,
					});
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the stages to display them to user so that they can
			// select them easily
			async getStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(
					this,
					'GET',
					'/sobjects/opportunity/describe',
				);
				for (const field of fields) {
					if (field.name === 'StageName') {
						for (const pickValue of field.picklistValues) {
							const pickValueName = pickValue.label;
							const pickValueId = pickValue.value;
							returnData.push({
								name: pickValueName,
								value: pickValueId,
							});
						}
					}
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the stages to display them to user so that they can
			// select them easily
			async getAccountTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(
					this,
					'GET',
					'/sobjects/account/describe',
				);
				for (const field of fields) {
					if (field.name === 'Type') {
						for (const pickValue of field.picklistValues) {
							const pickValueName = pickValue.label;
							const pickValueId = pickValue.value;
							returnData.push({
								name: pickValueName,
								value: pickValueId,
							});
						}
					}
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the account sources to display them to user so that they can
			// select them easily
			async getAccountSources(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(
					this,
					'GET',
					'/sobjects/account/describe',
				);
				for (const field of fields) {
					if (field.name === 'AccountSource') {
						for (const pickValue of field.picklistValues) {
							const pickValueName = pickValue.label;
							const pickValueId = pickValue.value;
							returnData.push({
								name: pickValueName,
								value: pickValueId,
							});
						}
					}
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the case types to display them to user so that they can
			// select them easily
			async getCaseTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/case/describe');
				for (const field of fields) {
					if (field.name === 'Type') {
						for (const pickValue of field.picklistValues) {
							const pickValueName = pickValue.label;
							const pickValueId = pickValue.value;
							returnData.push({
								name: pickValueName,
								value: pickValueId,
							});
						}
					}
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the case statuses to display them to user so that they can
			// select them easily
			async getCaseStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/case/describe');
				for (const field of fields) {
					if (field.name === 'Status') {
						for (const pickValue of field.picklistValues) {
							const pickValueName = pickValue.label;
							const pickValueId = pickValue.value;
							returnData.push({
								name: pickValueName,
								value: pickValueId,
							});
						}
					}
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the case reasons to display them to user so that they can
			// select them easily
			async getCaseReasons(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/case/describe');
				for (const field of fields) {
					if (field.name === 'Reason') {
						for (const pickValue of field.picklistValues) {
							const pickValueName = pickValue.label;
							const pickValueId = pickValue.value;
							returnData.push({
								name: pickValueName,
								value: pickValueId,
							});
						}
					}
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the case origins to display them to user so that they can
			// select them easily
			async getCaseOrigins(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/case/describe');
				for (const field of fields) {
					if (field.name === 'Origin') {
						for (const pickValue of field.picklistValues) {
							const pickValueName = pickValue.label;
							const pickValueId = pickValue.value;
							returnData.push({
								name: pickValueName,
								value: pickValueId,
							});
						}
					}
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the case priorities to display them to user so that they can
			// select them easily
			async getCasePriorities(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/case/describe');
				for (const field of fields) {
					if (field.name === 'Priority') {
						for (const pickValue of field.picklistValues) {
							const pickValueName = pickValue.label;
							const pickValueId = pickValue.value;
							returnData.push({
								name: pickValueName,
								value: pickValueId,
							});
						}
					}
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the task statuses to display them to user so that they can
			// select them easily
			async getTaskStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/task/describe');
				for (const field of fields) {
					if (field.name === 'Status') {
						for (const pickValue of field.picklistValues) {
							const pickValueName = pickValue.label;
							const pickValueId = pickValue.value;
							returnData.push({
								name: pickValueName,
								value: pickValueId,
							});
						}
					}
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the task types to display them to user so that they can
			// select them easily
			async getTaskTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/task/describe');
				for (const field of fields) {
					if (field.name === 'TaskSubtype') {
						for (const pickValue of field.picklistValues) {
							const pickValueName = pickValue.label;
							const pickValueId = pickValue.value;
							returnData.push({
								name: pickValueName,
								value: pickValueId,
							});
						}
					}
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the task subjects to display them to user so that they can
			// select them easily
			async getTaskSubjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/task/describe');
				for (const field of fields) {
					if (field.name === 'Subject') {
						for (const pickValue of field.picklistValues) {
							const pickValueName = pickValue.label;
							const pickValueId = pickValue.value;
							returnData.push({
								name: pickValueName,
								value: pickValueId,
							});
						}
					}
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the task call types to display them to user so that they can
			// select them easily
			async getTaskCallTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/task/describe');
				for (const field of fields) {
					if (field.name === 'CallType') {
						for (const pickValue of field.picklistValues) {
							const pickValueName = pickValue.label;
							const pickValueId = pickValue.value;
							returnData.push({
								name: pickValueName,
								value: pickValueId,
							});
						}
					}
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the task call priorities to display them to user so that they can
			// select them easily
			async getTaskPriorities(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/task/describe');
				for (const field of fields) {
					if (field.name === 'Priority') {
						for (const pickValue of field.picklistValues) {
							const pickValueName = pickValue.label;
							const pickValueId = pickValue.value;
							returnData.push({
								name: pickValueName,
								value: pickValueId,
							});
						}
					}
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the task recurrence types to display them to user so that they can
			// select them easily
			async getTaskRecurrenceTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/task/describe');
				for (const field of fields) {
					if (field.name === 'RecurrenceType') {
						for (const pickValue of field.picklistValues) {
							const pickValueName = pickValue.label;
							const pickValueId = pickValue.value;
							returnData.push({
								name: pickValueName,
								value: pickValueId,
							});
						}
					}
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the task recurrence instances to display them to user so that they can
			// select them easily
			async getTaskRecurrenceInstances(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/task/describe');
				for (const field of fields) {
					if (field.name === 'RecurrenceInstance') {
						for (const pickValue of field.picklistValues) {
							const pickValueName = pickValue.label;
							const pickValueId = pickValue.value;
							returnData.push({
								name: pickValueName,
								value: pickValueId,
							});
						}
					}
				}
				sortOptions(returnData);
				return returnData;
			},

			// Get all the custom objects recurrence instances to display them to user so that they can
			// select them easily
			async getCustomObjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { sobjects: objects } = await salesforceApiRequest.call(this, 'GET', '/sobjects');
				for (const object of objects) {
					if (object.custom === true) {
						const objectName = object.label;
						const objectId = object.name;
						returnData.push({
							name: objectName,
							value: objectId,
						});
					}
				}
				sortOptions(returnData);
				return returnData;
			},

			// Get all the custom objects fields recurrence instances to display them to user so that they can
			// select them easily
			async getCustomObjectFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const customObject = this.getCurrentNodeParameter('customObject') as string;
				const { fields } = await salesforceApiRequest.call(
					this,
					'GET',
					`/sobjects/${customObject}/describe`,
				);
				for (const field of fields) {
					const fieldName = field.label;
					const fieldId = field.name;
					returnData.push({
						name: fieldName,
						value: fieldId,
					});
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the account fields recurrence instances to display them to user so that they can
			// select them easily
			async getAccountFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(
					this,
					'GET',
					'/sobjects/account/describe',
				);
				for (const field of fields) {
					const fieldName = field.label;
					const fieldId = field.name;
					returnData.push({
						name: fieldName,
						value: fieldId,
					});
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the attachment fields recurrence instances to display them to user so that they can
			// select them easily
			async getAtachmentFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(
					this,
					'GET',
					'/sobjects/attachment/describe',
				);
				for (const field of fields) {
					const fieldName = field.label;
					const fieldId = field.name;
					returnData.push({
						name: fieldName,
						value: fieldId,
					});
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the case fields recurrence instances to display them to user so that they can
			// select them easily
			async getCaseFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/case/describe');
				for (const field of fields) {
					const fieldName = field.label;
					const fieldId = field.name;
					returnData.push({
						name: fieldName,
						value: fieldId,
					});
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the lead fields recurrence instances to display them to user so that they can
			// select them easily
			async getLeadFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/lead/describe');
				for (const field of fields) {
					const fieldName = field.label;
					const fieldId = field.name;
					returnData.push({
						name: fieldName,
						value: fieldId,
					});
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the opportunity fields recurrence instances to display them to user so that they can
			// select them easily
			async getOpportunityFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(
					this,
					'GET',
					'/sobjects/opportunity/describe',
				);
				for (const field of fields) {
					const fieldName = field.label;
					const fieldId = field.name;
					returnData.push({
						name: fieldName,
						value: fieldId,
					});
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the opportunity fields recurrence instances to display them to user so that they can
			// select them easily
			async getTaskFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/task/describe');
				for (const field of fields) {
					const fieldName = field.label;
					const fieldId = field.name;
					returnData.push({
						name: fieldName,
						value: fieldId,
					});
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the users fields recurrence instances to display them to user so that they can
			// select them easily
			async getUserFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(this, 'GET', '/sobjects/user/describe');
				for (const field of fields) {
					const fieldName = field.label;
					const fieldId = field.name;
					returnData.push({
						name: fieldName,
						value: fieldId,
					});
				}
				sortOptions(returnData);
				return returnData;
			},
			// Get all the contact fields recurrence instances to display them to user so that they can
			// select them easily
			async getContactFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				// TODO: find a way to filter this object to get just the lead sources instead of the whole object
				const { fields } = await salesforceApiRequest.call(
					this,
					'GET',
					'/sobjects/contact/describe',
				);
				for (const field of fields) {
					const fieldName = field.label;
					const fieldId = field.name;
					returnData.push({
						name: fieldName,
						value: fieldId,
					});
				}
				sortOptions(returnData);
				return returnData;
			},
			// // Get all folders to display them to user so that they can
			// // select them easily
			// async getFolders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
			// 	const returnData: INodePropertyOptions[] = [];
			// 	const fields = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/sobjects/folder/describe');
			// 	console.log(JSON.stringify(fields, undefined, 2))
			// 	const qs = {
			// 		//ContentFolderItem ContentWorkspace ContentFolder
			// 		q: `SELECT Id, Title FROM ContentVersion`,
			// 		//q: `SELECT Id FROM Folder where Type = 'Document'`,

			// 	};
			// 	const folders = await salesforceApiRequestAllItems.call(this, 'records', 'GET', '/query', {}, qs);
			// 	for (const folder of folders) {
			// 		returnData.push({
			// 			name: folder.Name,
			// 			value: folder.Id,
			// 		});
			// 	}
			// 	return returnData;
			// },
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		let responseData;
		const qs: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		// this.logger.debug(
		// 	`Running "Salesforce" node named "${this.getNode.name}" resource "${resource}" operation "${operation}"`,
		// );

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'customObject') {
					if (operation === 'create' || operation === 'upsert') {
						const customObject = this.getNodeParameter('customObject', i) as string;
						const customFieldsUi = this.getNodeParameter('customFieldsUi', i) as IDataObject;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const body: IDataObject = {};
						if (customFieldsUi) {
							const customFields = customFieldsUi.customFieldsValues as IDataObject[];
							if (customFields) {
								for (const customField of customFields) {
									body[customField.fieldId as string] = customField.value;
								}
							}
						}
						if (additionalFields.recordTypeId) {
							body.RecordTypeId = additionalFields.recordTypeId as string;
						}
						let endpoint = `/sobjects/${customObject}`;
						let method: IHttpRequestMethods = 'POST';
						if (operation === 'upsert') {
							method = 'PATCH';
							const externalId = this.getNodeParameter('externalId', 0) as string;
							const externalIdValue = this.getNodeParameter('externalIdValue', i) as string;
							endpoint = `/sobjects/${customObject}/${externalId}/${externalIdValue}`;
							if (body[externalId] !== undefined) {
								delete body[externalId];
							}
						}
						responseData = await salesforceApiRequest.call(this, method, endpoint, body);
					}
					if (operation === 'update') {
						const recordId = this.getNodeParameter('recordId', i) as string;
						const customObject = this.getNodeParameter('customObject', i) as string;
						const customFieldsUi = this.getNodeParameter('customFieldsUi', i) as IDataObject;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IDataObject = {};
						if (updateFields.recordTypeId) {
							body.RecordTypeId = updateFields.recordTypeId as string;
						}
						if (customFieldsUi) {
							const customFields = customFieldsUi.customFieldsValues as IDataObject[];
							if (customFields) {
								for (const customField of customFields) {
									body[customField.fieldId as string] = customField.value;
								}
							}
						}
						responseData = await salesforceApiRequest.call(
							this,
							'PATCH',
							`/sobjects/${customObject}/${recordId}`,
							body,
						);
					}
					if (operation === 'get') {
						const customObject = this.getNodeParameter('customObject', i) as string;
						const recordId = this.getNodeParameter('recordId', i) as string;
						responseData = await salesforceApiRequest.call(
							this,
							'GET',
							`/sobjects/${customObject}/${recordId}`,
						);
					}
					if (operation === 'getAll') {
						const customObject = this.getNodeParameter('customObject', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						const options = this.getNodeParameter('options', i);
						try {
							if (returnAll) {
								qs.q = getQuery(options, customObject, returnAll);
								responseData = await salesforceApiRequestAllItems.call(
									this,
									'records',
									'GET',
									'/query',
									{},
									qs,
								);
							} else {
								const limit = this.getNodeParameter('limit', i);
								qs.q = getQuery(options, customObject, returnAll, limit);
								responseData = await salesforceApiRequestAllItems.call(
									this,
									'records',
									'GET',
									'/query',
									{},
									qs,
								);
							}
						} catch (error) {
							throw new NodeApiError(this.getNode(), error as JsonObject);
						}
					}
					if (operation === 'delete') {
						const customObject = this.getNodeParameter('customObject', i) as string;
						const recordId = this.getNodeParameter('recordId', i) as string;
						try {
							responseData = await salesforceApiRequest.call(
								this,
								'DELETE',
								`/sobjects/${customObject}/${recordId}`,
							);
						} catch (error) {
							throw new NodeApiError(this.getNode(), error as JsonObject);
						}
					}
				}

				if (resource === 'opportunity') {
					//https://developer.salesforce.com/docs/api-explorer/sobject/Opportunity/post-opportunity
					if (operation === 'create' || operation === 'upsert') {
						const name = this.getNodeParameter('name', i) as string;
						const closeDate = this.getNodeParameter('closeDate', i) as string;
						const stageName = this.getNodeParameter('stageName', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const body: IOpportunity = {
							Name: name,
							CloseDate: closeDate,
							StageName: stageName,
						};
						if (additionalFields.type !== undefined) {
							body.Type = additionalFields.type as string;
						}
						if (additionalFields.amount !== undefined) {
							body.Amount = additionalFields.amount as number;
						}
						if (additionalFields.owner !== undefined) {
							body.OwnerId = additionalFields.owner as string;
						}
						if (additionalFields.nextStep !== undefined) {
							body.NextStep = additionalFields.nextStep as string;
						}
						if (additionalFields.accountId !== undefined) {
							body.AccountId = additionalFields.accountId as string;
						}
						if (additionalFields.campaignId !== undefined) {
							body.CampaignId = additionalFields.campaignId as string;
						}
						if (additionalFields.leadSource !== undefined) {
							body.LeadSource = additionalFields.leadSource as string;
						}
						if (additionalFields.description !== undefined) {
							body.Description = additionalFields.description as string;
						}
						if (additionalFields.probability !== undefined) {
							body.Probability = additionalFields.probability as number;
						}
						if (additionalFields.pricebook2Id !== undefined) {
							body.Pricebook2Id = additionalFields.pricebook2Id as string;
						}
						if (additionalFields.forecastCategoryName !== undefined) {
							body.ForecastCategoryName = additionalFields.forecastCategoryName as string;
						}
						if (additionalFields.customFieldsUi) {
							const customFields = (additionalFields.customFieldsUi as IDataObject)
								.customFieldsValues as IDataObject[];
							if (customFields) {
								for (const customField of customFields) {
									body[customField.fieldId as string] = customField.value;
								}
							}
						}
						let endpoint = '/sobjects/opportunity';
						let method: IHttpRequestMethods = 'POST';
						if (operation === 'upsert') {
							method = 'PATCH';
							const externalId = this.getNodeParameter('externalId', 0) as string;
							const externalIdValue = this.getNodeParameter('externalIdValue', i) as string;
							endpoint = `/sobjects/opportunity/${externalId}/${externalIdValue}`;
							if (body[externalId] !== undefined) {
								delete body[externalId];
							}
						}
						responseData = await salesforceApiRequest.call(this, method, endpoint, body);
					}
					//https://developer.salesforce.com/docs/api-explorer/sobject/Opportunity/post-opportunity
					if (operation === 'update') {
						const opportunityId = this.getNodeParameter('opportunityId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IOpportunity = {};
						if (updateFields.name !== undefined) {
							body.Name = updateFields.name as string;
						}
						if (updateFields.closeDate !== undefined) {
							body.CloseDate = updateFields.closeDate as string;
						}
						if (updateFields.stageName !== undefined) {
							body.StageName = updateFields.stageName as string;
						}
						if (updateFields.type !== undefined) {
							body.Type = updateFields.type as string;
						}
						if (updateFields.amount !== undefined) {
							body.Amount = updateFields.amount as number;
						}
						if (updateFields.owner !== undefined) {
							body.OwnerId = updateFields.owner as string;
						}
						if (updateFields.nextStep !== undefined) {
							body.NextStep = updateFields.nextStep as string;
						}
						if (updateFields.accountId !== undefined) {
							body.AccountId = updateFields.accountId as string;
						}
						if (updateFields.campaignId !== undefined) {
							body.CampaignId = updateFields.campaignId as string;
						}
						if (updateFields.leadSource !== undefined) {
							body.LeadSource = updateFields.leadSource as string;
						}
						if (updateFields.description !== undefined) {
							body.Description = updateFields.description as string;
						}
						if (updateFields.probability !== undefined) {
							body.Probability = updateFields.probability as number;
						}
						if (updateFields.pricebook2Id !== undefined) {
							body.Pricebook2Id = updateFields.pricebook2Id as string;
						}
						if (updateFields.forecastCategoryName !== undefined) {
							body.ForecastCategoryName = updateFields.forecastCategoryName as string;
						}
						if (updateFields.customFieldsUi) {
							const customFields = (updateFields.customFieldsUi as IDataObject)
								.customFieldsValues as IDataObject[];
							if (customFields) {
								for (const customField of customFields) {
									body[customField.fieldId as string] = customField.value;
								}
							}
						}
						responseData = await salesforceApiRequest.call(
							this,
							'PATCH',
							`/sobjects/opportunity/${opportunityId}`,
							body,
						);
					}
					//https://developer.salesforce.com/docs/api-explorer/sobject/Opportunity/get-opportunity-id
					if (operation === 'get') {
						const opportunityId = this.getNodeParameter('opportunityId', i) as string;
						responseData = await salesforceApiRequest.call(
							this,
							'GET',
							`/sobjects/opportunity/${opportunityId}`,
						);
					}
					//https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const options = this.getNodeParameter('options', i);
						try {
							if (returnAll) {
								qs.q = getQuery(options, 'Opportunity', returnAll);
								responseData = await salesforceApiRequestAllItems.call(
									this,
									'records',
									'GET',
									'/query',
									{},
									qs,
								);
							} else {
								const limit = this.getNodeParameter('limit', i);
								qs.q = getQuery(options, 'Opportunity', returnAll, limit);
								responseData = await salesforceApiRequestAllItems.call(
									this,
									'records',
									'GET',
									'/query',
									{},
									qs,
								);
							}
						} catch (error) {
							throw new NodeApiError(this.getNode(), error as JsonObject);
						}
					}
					//https://developer.salesforce.com/docs/api-explorer/sobject/Opportunity/delete-opportunity-id
					if (operation === 'delete') {
						const opportunityId = this.getNodeParameter('opportunityId', i) as string;
						try {
							responseData = await salesforceApiRequest.call(
								this,
								'DELETE',
								`/sobjects/opportunity/${opportunityId}`,
							);
						} catch (error) {
							throw new NodeApiError(this.getNode(), error as JsonObject);
						}
					}
					//https://developer.salesforce.com/docs/api-explorer/sobject/Opportunity/get-opportunity
					if (operation === 'getSummary') {
						responseData = await salesforceApiRequest.call(this, 'GET', '/sobjects/opportunity');
					}
					//https://developer.salesforce.com/docs/api-explorer/sobject/Note/post-note
					if (operation === 'addNote') {
						const opportunityId = this.getNodeParameter('opportunityId', i) as string;
						const title = this.getNodeParameter('title', i) as string;
						const options = this.getNodeParameter('options', i);
						const body: INote = {
							Title: title,
							ParentId: opportunityId,
						};
						if (options.body !== undefined) {
							body.Body = options.body as string;
						}
						if (options.owner !== undefined) {
							body.OwnerId = options.owner as string;
						}
						if (options.isPrivate !== undefined) {
							body.IsPrivate = options.isPrivate as boolean;
						}
						responseData = await salesforceApiRequest.call(this, 'POST', '/sobjects/note', body);
					}
				}
				if (resource === 'account') {
					//https://developer.salesforce.com/docs/api-explorer/sobject/Account/post-account
					if (operation === 'create' || operation === 'upsert') {
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const name = this.getNodeParameter('name', i) as string;
						const body: IAccount = {
							Name: name,
						};
						if (additionalFields.fax !== undefined) {
							body.Fax = additionalFields.fax as string;
						}
						if (additionalFields.type !== undefined) {
							body.Type = additionalFields.type as string;
						}
						if (additionalFields.jigsaw !== undefined) {
							body.Jigsaw = additionalFields.jigsaw as string;
						}
						if (additionalFields.phone !== undefined) {
							body.Phone = additionalFields.phone as string;
						}
						if (additionalFields.owner !== undefined) {
							body.OwnerId = additionalFields.owner as string;
						}
						if (additionalFields.sicDesc !== undefined) {
							body.SicDesc = additionalFields.sicDesc as string;
						}
						if (additionalFields.website !== undefined) {
							body.Website = additionalFields.website as string;
						}
						if (additionalFields.industry !== undefined) {
							body.Industry = additionalFields.industry as string;
						}
						if (additionalFields.parentId !== undefined) {
							body.ParentId = additionalFields.parentId as string;
						}
						if (additionalFields.billingCity !== undefined) {
							body.BillingCity = additionalFields.billingCity as string;
						}
						if (additionalFields.description !== undefined) {
							body.Description = additionalFields.description as string;
						}
						if (additionalFields.billingState !== undefined) {
							body.BillingState = additionalFields.billingState as string;
						}
						if (additionalFields.shippingCity !== undefined) {
							body.ShippingCity = additionalFields.shippingCity as string;
						}
						if (additionalFields.accountNumber !== undefined) {
							body.AccountNumber = additionalFields.accountNumber as string;
						}
						if (additionalFields.accountSource !== undefined) {
							body.AccountSource = additionalFields.accountSource as string;
						}
						if (additionalFields.annualRevenue !== undefined) {
							body.AnnualRevenue = additionalFields.annualRevenue as number;
						}
						if (additionalFields.billingStreet !== undefined) {
							body.BillingStreet = additionalFields.billingStreet as string;
						}
						if (additionalFields.shippingState !== undefined) {
							body.ShippingState = additionalFields.shippingState as string;
						}
						if (additionalFields.billingCountry !== undefined) {
							body.BillingCountry = additionalFields.billingCountry as string;
						}
						if (additionalFields.shippingStreet !== undefined) {
							body.ShippingStreet = additionalFields.shippingStreet as string;
						}
						if (additionalFields.shippingCountry !== undefined) {
							body.ShippingCountry = additionalFields.shippingCountry as string;
						}
						if (additionalFields.billingPostalCode !== undefined) {
							body.BillingPostalCode = additionalFields.billingPostalCode as string;
						}
						if (additionalFields.numberOfEmployees !== undefined) {
							body.NumberOfEmployees = additionalFields.numberOfEmployees as string;
						}
						if (additionalFields.shippingPostalCode !== undefined) {
							body.ShippingPostalCode = additionalFields.shippingPostalCode as string;
						}
						if (additionalFields.shippingPostalCode !== undefined) {
							body.ShippingPostalCode = additionalFields.shippingPostalCode as string;
						}
						if (additionalFields.recordTypeId !== undefined) {
							body.RecordTypeId = additionalFields.recordTypeId as string;
						}
						if (additionalFields.customFieldsUi) {
							const customFields = (additionalFields.customFieldsUi as IDataObject)
								.customFieldsValues as IDataObject[];
							if (customFields) {
								for (const customField of customFields) {
									body[customField.fieldId as string] = customField.value;
								}
							}
						}
						let endpoint = '/sobjects/account';
						let method: IHttpRequestMethods = 'POST';
						if (operation === 'upsert') {
							method = 'PATCH';
							const externalId = this.getNodeParameter('externalId', 0) as string;
							const externalIdValue = this.getNodeParameter('externalIdValue', i) as string;
							endpoint = `/sobjects/account/${externalId}/${externalIdValue}`;
							if (body[externalId] !== undefined) {
								delete body[externalId];
							}
						}
						responseData = await salesforceApiRequest.call(this, method, endpoint, body);
					}
					//https://developer.salesforce.com/docs/api-explorer/sobject/Account/patch-account-id
					if (operation === 'update') {
						const accountId = this.getNodeParameter('accountId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IAccount = {};
						if (updateFields.name !== undefined) {
							body.Name = updateFields.name as string;
						}
						if (updateFields.fax !== undefined) {
							body.Fax = updateFields.fax as string;
						}
						if (updateFields.type !== undefined) {
							body.Type = updateFields.type as string;
						}
						if (updateFields.jigsaw !== undefined) {
							body.Jigsaw = updateFields.jigsaw as string;
						}
						if (updateFields.phone !== undefined) {
							body.Phone = updateFields.phone as string;
						}
						if (updateFields.ownerId !== undefined) {
							body.OwnerId = updateFields.ownerId as string;
						}
						if (updateFields.sicDesc !== undefined) {
							body.SicDesc = updateFields.sicDesc as string;
						}
						if (updateFields.recordTypeId !== undefined) {
							body.RecordTypeId = updateFields.recordTypeId as string;
						}
						if (updateFields.website !== undefined) {
							body.Website = updateFields.website as string;
						}
						if (updateFields.industry !== undefined) {
							body.Industry = updateFields.industry as string;
						}
						if (updateFields.parentId !== undefined) {
							body.ParentId = updateFields.parentId as string;
						}
						if (updateFields.billingCity !== undefined) {
							body.BillingCity = updateFields.billingCity as string;
						}
						if (updateFields.description !== undefined) {
							body.Description = updateFields.description as string;
						}
						if (updateFields.billingState !== undefined) {
							body.BillingState = updateFields.billingState as string;
						}
						if (updateFields.shippingCity !== undefined) {
							body.ShippingCity = updateFields.shippingCity as string;
						}
						if (updateFields.accountNumber !== undefined) {
							body.AccountNumber = updateFields.accountNumber as string;
						}
						if (updateFields.accountSource !== undefined) {
							body.AccountSource = updateFields.accountSource as string;
						}
						if (updateFields.annualRevenue !== undefined) {
							body.AnnualRevenue = updateFields.annualRevenue as number;
						}
						if (updateFields.billingStreet !== undefined) {
							body.BillingStreet = updateFields.billingStreet as string;
						}
						if (updateFields.shippingState !== undefined) {
							body.ShippingState = updateFields.shippingState as string;
						}
						if (updateFields.billingCountry !== undefined) {
							body.BillingCountry = updateFields.billingCountry as string;
						}
						if (updateFields.shippingStreet !== undefined) {
							body.ShippingStreet = updateFields.shippingStreet as string;
						}
						if (updateFields.shippingCountry !== undefined) {
							body.ShippingCountry = updateFields.shippingCountry as string;
						}
						if (updateFields.billingPostalCode !== undefined) {
							body.BillingPostalCode = updateFields.billingPostalCode as string;
						}
						if (updateFields.numberOfEmployees !== undefined) {
							body.NumberOfEmployees = updateFields.numberOfEmployees as string;
						}
						if (updateFields.shippingPostalCode !== undefined) {
							body.ShippingPostalCode = updateFields.shippingPostalCode as string;
						}
						if (updateFields.shippingPostalCode !== undefined) {
							body.ShippingPostalCode = updateFields.shippingPostalCode as string;
						}
						if (updateFields.customFieldsUi) {
							const customFields = (updateFields.customFieldsUi as IDataObject)
								.customFieldsValues as IDataObject[];
							if (customFields) {
								for (const customField of customFields) {
									body[customField.fieldId as string] = customField.value;
								}
							}
						}
						responseData = await salesforceApiRequest.call(
							this,
							'PATCH',
							`/sobjects/account/${accountId}`,
							body,
						);
					}
					//https://developer.salesforce.com/docs/api-explorer/sobject/Account/get-account-id
					if (operation === 'get') {
						const accountId = this.getNodeParameter('accountId', i) as string;
						responseData = await salesforceApiRequest.call(
							this,
							'GET',
							`/sobjects/account/${accountId}`,
						);
					}
					//https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const options = this.getNodeParameter('options', i);
						try {
							if (returnAll) {
								qs.q = getQuery(options, 'Account', returnAll);
								responseData = await salesforceApiRequestAllItems.call(
									this,
									'records',
									'GET',
									'/query',
									{},
									qs,
								);
							} else {
								const limit = this.getNodeParameter('limit', i);
								qs.q = getQuery(options, 'Account', returnAll, limit);
								responseData = await salesforceApiRequestAllItems.call(
									this,
									'records',
									'GET',
									'/query',
									{},
									qs,
								);
							}
						} catch (error) {
							throw new NodeApiError(this.getNode(), error as JsonObject);
						}
					}
					//https://developer.salesforce.com/docs/api-explorer/sobject/Account/delete-account-id
					if (operation === 'delete') {
						const accountId = this.getNodeParameter('accountId', i) as string;
						try {
							responseData = await salesforceApiRequest.call(
								this,
								'DELETE',
								`/sobjects/account/${accountId}`,
							);
						} catch (error) {
							throw new NodeApiError(this.getNode(), error as JsonObject);
						}
					}
					//https://developer.salesforce.com/docs/api-explorer/sobject/Account/get-account
					if (operation === 'getSummary') {
						responseData = await salesforceApiRequest.call(this, 'GET', '/sobjects/account');
					}
					//https://developer.salesforce.com/docs/api-explorer/sobject/Note/post-note
					if (operation === 'addNote') {
						const accountId = this.getNodeParameter('accountId', i) as string;
						const title = this.getNodeParameter('title', i) as string;
						const options = this.getNodeParameter('options', i);
						const body: INote = {
							Title: title,
							ParentId: accountId,
						};
						if (options.body !== undefined) {
							body.Body = options.body as string;
						}
						if (options.owner !== undefined) {
							body.OwnerId = options.owner as string;
						}
						if (options.isPrivate !== undefined) {
							body.IsPrivate = options.isPrivate as boolean;
						}
						responseData = await salesforceApiRequest.call(this, 'POST', '/sobjects/note', body);
					}
				}
				if (resource === 'attachment') {
					//https://developer.salesforce.com/docs/api-explorer/sobject/Attachment/post-attachment
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const parentId = this.getNodeParameter('parentId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
						const body: IAttachment = {
							Name: name,
							ParentId: parentId,
						};
						if (items[i].binary?.[binaryPropertyName as any]) {
							body.Body = items[i].binary![binaryPropertyName as any].data;
							body.ContentType = items[i].binary![binaryPropertyName as any].mimeType;
						} else {
							throw new NodeOperationError(
								this.getNode(),
								`The property ${binaryPropertyName} does not exist`,
								{ itemIndex: i },
							);
						}
						if (additionalFields.description !== undefined) {
							body.Description = additionalFields.description as string;
						}
						if (additionalFields.owner !== undefined) {
							body.OwnerId = additionalFields.owner as string;
						}
						if (additionalFields.isPrivate !== undefined) {
							body.IsPrivate = additionalFields.isPrivate as boolean;
						}
						responseData = await salesforceApiRequest.call(
							this,
							'POST',
							'/sobjects/attachment',
							body,
						);
					}
					//https://developer.salesforce.com/docs/api-explorer/sobject/Attachment/patch-attachment-id
					if (operation === 'update') {
						const attachmentId = this.getNodeParameter('attachmentId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IAttachment = {};
						if (updateFields.binaryPropertyName !== undefined) {
							const binaryPropertyName = updateFields.binaryPropertyName as string;
							if (items[i].binary?.[binaryPropertyName]) {
								body.Body = items[i].binary![binaryPropertyName].data;
								body.ContentType = items[i].binary![binaryPropertyName].mimeType;
							} else {
								throw new NodeOperationError(
									this.getNode(),
									`The property ${binaryPropertyName} does not exist`,
									{ itemIndex: i },
								);
							}
						}
						if (updateFields.name !== undefined) {
							body.Name = updateFields.name as string;
						}
						if (updateFields.description !== undefined) {
							body.Description = updateFields.description as string;
						}
						if (updateFields.owner !== undefined) {
							body.OwnerId = updateFields.owner as string;
						}
						if (updateFields.isPrivate !== undefined) {
							body.IsPrivate = updateFields.isPrivate as boolean;
						}
						responseData = await salesforceApiRequest.call(
							this,
							'PATCH',
							`/sobjects/attachment/${attachmentId}`,
							body,
						);
					}
					//https://developer.salesforce.com/docs/api-explorer/sobject/Attachment/get-attachment-id
					if (operation === 'get') {
						const attachmentId = this.getNodeParameter('attachmentId', i) as string;
						responseData = await salesforceApiRequest.call(
							this,
							'GET',
							`/sobjects/attachment/${attachmentId}`,
						);
					}
					//https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const options = this.getNodeParameter('options', i);
						try {
							if (returnAll) {
								qs.q = getQuery(options, 'Attachment', returnAll);
								responseData = await salesforceApiRequestAllItems.call(
									this,
									'records',
									'GET',
									'/query',
									{},
									qs,
								);
							} else {
								const limit = this.getNodeParameter('limit', i);
								qs.q = getQuery(options, 'Attachment', returnAll, limit);
								responseData = await salesforceApiRequestAllItems.call(
									this,
									'records',
									'GET',
									'/query',
									{},
									qs,
								);
							}
						} catch (error) {
							throw new NodeApiError(this.getNode(), error as JsonObject);
						}
					}
					//https://developer.salesforce.com/docs/api-explorer/sobject/Attachment/delete-attachment-id
					if (operation === 'delete') {
						const attachmentId = this.getNodeParameter('attachmentId', i) as string;
						try {
							responseData = await salesforceApiRequest.call(
								this,
								'DELETE',
								`/sobjects/attachment/${attachmentId}`,
							);
						} catch (error) {
							throw new NodeApiError(this.getNode(), error as JsonObject);
						}
					}
					//https://developer.salesforce.com/docs/api-explorer/sobject/Attachment/get-attachment-id
					if (operation === 'getSummary') {
						responseData = await salesforceApiRequest.call(this, 'GET', '/sobjects/attachment');
					}
				}
				if (resource === 'user') {
					//https://developer.salesforce.com/docs/api-explorer/sobject/User/get-user-id
					if (operation === 'get') {
						const userId = this.getNodeParameter('userId', i) as string;
						responseData = await salesforceApiRequest.call(this, 'GET', `/sobjects/user/${userId}`);
					}
					//https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const options = this.getNodeParameter('options', i);
						try {
							if (returnAll) {
								qs.q = getQuery(options, 'User', returnAll);
								responseData = await salesforceApiRequestAllItems.call(
									this,
									'records',
									'GET',
									'/query',
									{},
									qs,
								);
							} else {
								const limit = this.getNodeParameter('limit', i);
								qs.q = getQuery(options, 'User', returnAll, limit);
								responseData = await salesforceApiRequestAllItems.call(
									this,
									'records',
									'GET',
									'/query',
									{},
									qs,
								);
							}
						} catch (error) {
							throw new NodeApiError(this.getNode(), error as JsonObject);
						}
					}
				}

				if (resource === 'search') {
					//https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
					if (operation === 'query') {
						qs.q = this.getNodeParameter('query', i) as string;
						responseData = await salesforceApiRequestAllItems.call(
							this,
							'records',
							'GET',
							'/query',
							{},
							qs,
						);
					}
				}

				if (!Array.isArray(responseData) && responseData === undefined) {
					// Make sure that always valid JSON gets returned which also matches the
					// Salesforce default response
					responseData = {
						errors: [],
						success: true,
					};
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}
