import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';
import { CustomSalesforceV1 } from './v1/CustomSalesforceV1.node';
import { CustomSalesforceV2 } from './v2/CustomSalesforceV2.node';

export class CustomSalesforce extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Custom Salesforce',
			name: 'CustomSalesforce',
			icon: 'file:salesforce.svg',
			group: ['output'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Salesforce',
			defaultVersion: 1,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new CustomSalesforceV1(baseDescription),
			2: new CustomSalesforceV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
