import type {
	IPollFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

import { salesforceApiRequest, sortOptions } from './utils/GenericFunctions';
import { router } from './triggers/router';

export class CustomSalesforceTriggerV2 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Salesforce Trigger V2',
		name: 'customSalesforceTriggerV2',
		icon: 'file:salesforce.svg',
		group: ['trigger'],
		version: 1,
		description:
			'Fetches data from Salesforce and starts the workflow on specified polling intervals.',
		subtitle: '={{($parameter["triggerOn"])}}',
		defaults: {
			name: 'Salesforce Trigger',
		},
		credentials: [
			{
				name: 'customSalesforceOAuth2Api',
				required: true,
			},
		],
		polling: true,
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Trigger On',
				name: 'triggerOn',
				description: 'Which Salesforce event should trigger the node',
				type: 'options',
				default: 'opportunityCreated',
				options: [
					{
						name: 'Account Created',
						value: 'accountCreated',
						description: 'When a new account is created',
					},
					{
						name: 'Account Updated',
						value: 'accountUpdated',
						description: 'When an existing account is modified',
					},
					{
						name: 'Attachment Created',
						value: 'attachmentCreated',
						description: 'When a file is uploaded and attached to an object',
					},
					{
						name: 'Attachment Updated',
						value: 'attachmentUpdated',
						description: 'When an existing file is modified',
					},
					{
						name: 'Case Created',
						value: 'caseCreated',
						description: 'When a new case is created',
					},
					{
						name: 'Case Updated',
						value: 'caseUpdated',
						description: 'When an existing case is modified',
					},
					{
						name: 'Contact Created',
						value: 'contactCreated',
						description: 'When a new contact is created',
					},
					{
						name: 'Contact Updated',
						value: 'contactUpdated',
						description: 'When an existing contact is modified',
					},
					{
						name: 'Custom Object Created',
						value: 'customObjectCreated',
						description: 'When a new object of a given type is created',
					},
					{
						name: 'Custom Object Updated',
						value: 'customObjectUpdated',
						description: 'When an object of a given type is modified',
					},
					{
						name: 'Lead Created',
						value: 'leadCreated',
						description: 'When a new lead is created',
					},
					{
						name: 'Lead Updated',
						value: 'leadUpdated',
						description: 'When an existing lead is modified',
					},
					{
						name: 'Opportunity Created',
						value: 'opportunityCreated',
						description: 'When a new opportunity is created',
					},
					{
						name: 'Opportunity Updated',
						value: 'opportunityUpdated',
						description: 'When an existing opportunity is created',
					},
					{
						name: 'Task Created',
						value: 'taskCreated',
						description: 'When a new task is created',
					},
					{
						name: 'Task Updated',
						value: 'taskUpdated',
						description: 'When an existing task is modified',
					},
					{
						name: 'User Created',
						value: 'userCreated',
						description: 'When a new user is created',
					},
					{
						name: 'User Updated',
						value: 'userUpdated',
						description: 'When an existing user is modified',
					},
				],
			},
			{
				displayName: 'Custom Object Name or ID',
				name: 'customObject',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCustomObjects',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						triggerOn: ['customObjectUpdated', 'customObjectCreated'],
					},
				},
				description:
					'Name of the custom object. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	};

	methods = {
		loadOptions: {
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
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		return await router.call(this);
	}
}
