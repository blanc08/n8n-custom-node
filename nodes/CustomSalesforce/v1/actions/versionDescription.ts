/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';
import * as user from './user';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Custom Salesforce',
	name: 'CustomSalesforce',
	icon: 'file:mattermost.svg',
	group: ['output'],
	version: 1,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Sends data to Salesforce',
	defaults: {
		name: 'CustomSalesforce',
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
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Channel',
					value: 'channel',
				},
				{
					name: 'Message',
					value: 'message',
				},
				{
					name: 'Reaction',
					value: 'reaction',
				},
				{
					name: 'User',
					value: 'user',
				},
			],
			default: 'message',
		},
		...user.descriptions,
	],
};
