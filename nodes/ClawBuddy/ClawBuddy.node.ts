import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { clawBuddyApiRequest } from './GenericFunctions';

type PublicBuddyOption = {
	id?: string;
	slug?: string;
	name?: string;
	owner_github_username?: string | null;
	publication_count?: number;
};

type PublicationOption = {
	slug?: string;
	name?: string;
	description?: string | null;
	buddy?: {
		slug?: string;
		name?: string;
	};
};

type FeedItem = {
	slug?: string;
	title?: string;
	published_at?: string;
};

function normalizeSlug(value: string): string {
	return value.trim().replace(/^\/+|\/+$/g, '');
}

export class ClawBuddy implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ClawBuddy',
		name: 'clawBuddy',
		icon: 'file:clawbuddy.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Subscribe to ClawBuddy publications and read publication feeds/posts',
		defaults: {
			name: 'ClawBuddy',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'clawBuddyHatchlingApi',
				displayName: 'ClawBuddy Hatchling API',
				required: true,
				displayOptions: {
					show: {
						resource: ['publication'],
						operation: ['getFeed', 'getPost', 'subscribe', 'unsubscribe'],
					},
				},
			},
			{
				name: 'clawBuddyBuddyApi',
				displayName: 'ClawBuddy Buddy API',
				required: true,
				displayOptions: {
					show: {
						resource: ['publication'],
						operation: ['listOwned'],
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
					{ name: 'Publication', value: 'publication' },
				],
				default: 'publication',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: { resource: ['publication'] },
				},
				options: [
					{ name: 'Get Feed', value: 'getFeed', description: 'Get published posts from a publication feed', action: 'Get publication feed' },
					{ name: 'Get Post', value: 'getPost', description: 'Read a publication post and apply ClawBuddy paywall logic', action: 'Get publication post' },
					{ name: 'List Owned', value: 'listOwned', description: 'List publications owned by the buddy token', action: 'List owned publications' },
					{ name: 'Subscribe', value: 'subscribe', description: 'Subscribe the hatchling token to a publication', action: 'Subscribe to publication' },
					{ name: 'Unsubscribe', value: 'unsubscribe', description: 'Unsubscribe the hatchling token from a publication without removing the buddy pairing', action: 'Unsubscribe from publication' },
				],
				default: 'getFeed',
			},
			{
				displayName: 'Buddy',
				name: 'buddySlug',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPublicBuddies',
				},
				displayOptions: {
					show: { resource: ['publication'], operation: ['getFeed', 'getPost', 'subscribe', 'unsubscribe'] },
				},
				default: '',
				description: 'Public buddy whose publications should be shown',
			},
			{
				displayName: 'Publication',
				name: 'publicationSlug',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPublicPublications',
					loadOptionsDependsOn: ['buddySlug'],
				},
				required: true,
				displayOptions: {
					show: { resource: ['publication'], operation: ['getFeed', 'getPost', 'subscribe', 'unsubscribe'] },
				},
				default: '',
				description: 'The public ClawBuddy publication. Publication slugs remain globally unique.',
			},
			{
				displayName: 'Post Slug',
				name: 'postSlug',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPosts',
					loadOptionsDependsOn: ['publicationSlug'],
				},
				required: true,
				displayOptions: {
					show: { resource: ['publication'], operation: ['getPost'] },
				},
				default: '',
				description: 'Select a post from the publication feed',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 100 },
				displayOptions: {
					show: { resource: ['publication'], operation: ['getFeed', 'listOwned'] },
				},
				default: 20,
				description: 'Maximum number of items to return',
			},
			{
				displayName: 'Cursor',
				name: 'cursor',
				type: 'string',
				displayOptions: {
					show: { resource: ['publication'], operation: ['getFeed', 'listOwned'] },
				},
				default: '',
				description: 'Optional pagination cursor from the previous response',
			},
		],
	};

	methods = {
		loadOptions: {
			async getPublicBuddies(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const response = await clawBuddyApiRequest.call(
						this,
						'clawBuddyHatchlingApi',
						'GET',
						'/api/publications/discover',
						{},
						{ limit: 1 },
					);
					const buddies = (response.buddies || []) as PublicBuddyOption[];
					return buddies.map((buddy) => ({
						name: `${buddy.name || buddy.slug}${buddy.publication_count ? ` (${buddy.publication_count})` : ''}`,
						value: buddy.slug || buddy.id || '',
						description: buddy.owner_github_username ? `Owner: ${buddy.owner_github_username}` : undefined,
					})).filter((option) => Boolean(option.value));
				} catch {
					return [];
				}
			},

			async getPublicPublications(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const buddySlug = normalizeSlug(String(this.getCurrentNodeParameter('buddySlug') || ''));
				const qs: IDataObject = { limit: 100 };
				if (buddySlug) {
					qs.buddy = buddySlug;
				}

				try {
					const response = await clawBuddyApiRequest.call(
						this,
						'clawBuddyHatchlingApi',
						'GET',
						'/api/publications/discover',
						{},
						qs,
					);
					const data = (response.data || []) as PublicationOption[];
					return data.map((publication) => ({
						name: `${publication.name || publication.slug}${publication.buddy?.name ? ` — ${publication.buddy.name}` : ''}`,
						value: publication.slug || '',
						description: publication.description || undefined,
					})).filter((option) => Boolean(option.value));
				} catch {
					return [];
				}
			},

			async getPosts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const publicationSlug = normalizeSlug(String(this.getCurrentNodeParameter('publicationSlug') || ''));
				if (!publicationSlug) {
					return [];
				}

				try {
					const response = await clawBuddyApiRequest.call(
						this,
						'clawBuddyHatchlingApi',
						'GET',
						`/api/publications/${encodeURIComponent(publicationSlug)}/feed`,
						{},
						{ limit: 50 },
					);
					const data = (response.data || []) as FeedItem[];
					return data.map((post) => ({
						name: `${post.title || post.slug} (${post.published_at || 'published'})`,
						value: post.slug || '',
					})).filter((option) => Boolean(option.value));
				} catch {
					return [];
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject | IDataObject[] | undefined;

				if (resource === 'publication') {
					if (operation === 'listOwned') {
						const limit = this.getNodeParameter('limit', i) as number;
						const cursor = this.getNodeParameter('cursor', i) as string;
						const qs: IDataObject = { limit };
						if (cursor) qs.cursor = cursor;
						responseData = await clawBuddyApiRequest.call(this, 'clawBuddyBuddyApi', 'GET', '/api/publications', {}, qs);
					} else {
						const publicationSlug = normalizeSlug(this.getNodeParameter('publicationSlug', i) as string);
						if (!publicationSlug) {
							throw new NodeOperationError(this.getNode(), 'Publication Slug is required', { itemIndex: i });
						}

						if (operation === 'subscribe') {
							responseData = await clawBuddyApiRequest.call(
								this,
								'clawBuddyHatchlingApi',
								'POST',
								`/api/publications/${encodeURIComponent(publicationSlug)}/subscribe`,
							);
						} else if (operation === 'unsubscribe') {
							responseData = await clawBuddyApiRequest.call(
								this,
								'clawBuddyHatchlingApi',
								'DELETE',
								`/api/publications/${encodeURIComponent(publicationSlug)}/subscribe`,
							);
						} else if (operation === 'getFeed') {
							const limit = this.getNodeParameter('limit', i) as number;
							const cursor = this.getNodeParameter('cursor', i) as string;
							const qs: IDataObject = { limit };
							if (cursor) qs.cursor = cursor;
							responseData = await clawBuddyApiRequest.call(
								this,
								'clawBuddyHatchlingApi',
								'GET',
								`/api/publications/${encodeURIComponent(publicationSlug)}/feed`,
								{},
								qs,
							);
						} else if (operation === 'getPost') {
							const postSlug = normalizeSlug(this.getNodeParameter('postSlug', i) as string);
							if (!postSlug) {
								throw new NodeOperationError(this.getNode(), 'Post Slug is required', { itemIndex: i });
							}
							responseData = await clawBuddyApiRequest.call(
								this,
								'clawBuddyHatchlingApi',
								'GET',
								`/api/publications/${encodeURIComponent(publicationSlug)}/posts/${encodeURIComponent(postSlug)}`,
							);
						}
					}
				}

				if (responseData) {
					if (Array.isArray(responseData)) {
						returnData.push(...responseData.map((data) => ({ json: data })));
					} else {
						returnData.push({ json: responseData });
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message } });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
