import { DateTime } from 'luxon';
import {
	IDataObject,
	INodeExecutionData,
	IPollFunctions,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';
import { getQuery, salesforceApiRequestAllItems } from '../utils/GenericFunctions';
import { LoggerProxy as Logger } from 'n8n-workflow';

export async function router(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
	const workflowData = this.getWorkflowStaticData('node');
	let responseData;
	const qs: IDataObject = {};
	const triggerOn = this.getNodeParameter('triggerOn') as string;
	let triggerResource = triggerOn.slice(0, 1).toUpperCase() + triggerOn.slice(1, -7);
	const changeType = triggerOn.slice(-7);

	if (triggerResource === 'CustomObject') {
		triggerResource = this.getNodeParameter('customObject') as string;
	}

	const now = DateTime.now().toISO();
	const startDate = (workflowData.lastTimeChecked as string) || now;
	const endDate = now;
	try {
		const pollStartDate = startDate;
		const pollEndDate = endDate;

		const options = {
			conditionsUi: {
				conditionValues: [] as IDataObject[],
			},
		};
		if (this.getMode() !== 'manual') {
			if (changeType === 'Created') {
				options.conditionsUi.conditionValues.push({
					field: 'CreatedDate',
					operation: '>=',
					value: pollStartDate,
				});
				options.conditionsUi.conditionValues.push({
					field: 'CreatedDate',
					operation: '<',
					value: pollEndDate,
				});
			} else {
				options.conditionsUi.conditionValues.push({
					field: 'LastModifiedDate',
					operation: '>=',
					value: pollStartDate,
				});
				options.conditionsUi.conditionValues.push({
					field: 'LastModifiedDate',
					operation: '<',
					value: pollEndDate,
				});
				// make sure the resource wasn't just created.
				options.conditionsUi.conditionValues.push({
					field: 'CreatedDate',
					operation: '<',
					value: pollStartDate,
				});
			}
		}

		try {
			if (this.getMode() === 'manual') {
				qs.q = getQuery(options, triggerResource, false, 1);
			} else {
				qs.q = getQuery(options, triggerResource, true);
			}
			responseData = await salesforceApiRequestAllItems.call(
				this,
				'records',
				'GET',
				'/query',
				{},
				qs,
			);
		} catch (error) {
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}

		if (!responseData?.length) {
			workflowData.lastTimeChecked = endDate;
			return null;
		}
	} catch (error) {
		if (this.getMode() === 'manual' || !workflowData.lastTimeChecked) {
			throw error;
		}
		// const workflow = this.getWorkflow();
		// const node = this.getNode();

		Logger.error(
			`There was a problem in '${workflowData.name}' node in workflow '${workflowData.id}': '${error.description}'`,
			{
				node: workflowData.name,
				workflowId: workflowData.id,
				error,
			},
		);

		throw error;
	}
	workflowData.lastTimeChecked = endDate;

	if (Array.isArray(responseData) && responseData.length) {
		return [this.helpers.returnJsonArray(responseData as IDataObject[])];
	}

	return null;
}
