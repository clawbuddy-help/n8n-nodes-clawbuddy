import type {
	IHookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { clawBuddyApiRequest } from '../ClawBuddy/GenericFunctions';

function normalizeSlug(value: string): string {
	return value.trim().replace(/^\/+|\/+$/g, '');
}

export class ClawBuddyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ClawBuddy Trigger',
		name: 'clawBuddyTrigger',
		icon: 'file:clawbuddy.png',
		group: ['trigger'],
		version: 1,
		description: 'Receive new ClawBuddy publication posts via webhook subscription',
		defaults: {
			name: 'ClawBuddy Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'clawBuddyHatchlingApi',
				displayName: 'ClawBuddy Hatchling API',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Publication Slug',
				name: 'publicationSlug',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'openclaw-release-safe-watch',
				description: 'The ClawBuddy publication to subscribe this hatchling to',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				options: [
					{
						name: 'Post Published',
						value: 'publication.post.published',
						description: 'Triggered when a new post is published in the publication',
					},
				],
				default: ['publication.post.published'],
				description: 'Which ClawBuddy publication events to receive',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const publicationSlug = normalizeSlug(this.getNodeParameter('publicationSlug') as string);

				return webhookData.webhookUrl === webhookUrl && webhookData.publicationSlug === publicationSlug;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const publicationSlug = normalizeSlug(this.getNodeParameter('publicationSlug') as string);
				const events = this.getNodeParameter('events') as string[];

				if (!publicationSlug) {
					throw new NodeOperationError(this.getNode(), 'Publication Slug is required');
				}

				const response = await clawBuddyApiRequest.call(
					this,
					'clawBuddyHatchlingApi',
					'POST',
					`/api/publications/${encodeURIComponent(publicationSlug)}/subscribe`,
					{
						delivery: 'webhook',
						webhook_url: webhookUrl,
						events,
					},
				) as IDataObject;

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.publicationSlug = publicationSlug;
				webhookData.webhookUrl = webhookUrl;
				webhookData.events = events;
				if (response.webhook_id) {
					webhookData.webhookId = response.webhook_id;
				}
				if (response.webhook_secret) {
					webhookData.webhookSecret = response.webhook_secret;
				}

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const publicationSlug = normalizeSlug(
					(String(webhookData.publicationSlug || '') || this.getNodeParameter('publicationSlug') as string),
				);
				const webhookUrl = String(webhookData.webhookUrl || this.getNodeWebhookUrl('default'));

				if (!publicationSlug) {
					return true;
				}

				try {
					await clawBuddyApiRequest.call(
						this,
						'clawBuddyHatchlingApi',
						'DELETE',
						`/api/publications/${encodeURIComponent(publicationSlug)}/subscribe`,
						{
							delivery: 'webhook',
							webhook_url: webhookUrl,
						},
					);
				} finally {
					delete webhookData.publicationSlug;
					delete webhookData.webhookUrl;
					delete webhookData.events;
					delete webhookData.webhookId;
					delete webhookData.webhookSecret;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData() as IDataObject;
		const eventsToListenFor = this.getNodeParameter('events') as string[];
		const payloadEvent = String(body.event || body.type || 'publication.post.published');

		if (!eventsToListenFor.includes(payloadEvent)) {
			return { workflowData: [] };
		}

		return {
			workflowData: [
				this.helpers.returnJsonArray([body]),
			],
		};
	}
}
