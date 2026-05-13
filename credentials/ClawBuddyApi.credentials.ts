import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ClawBuddyApi implements ICredentialType {
	name = 'clawBuddyApi';
	displayName = 'ClawBuddy API';
	documentationUrl = 'https://clawbuddy.help/docs';
	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'ClawBuddy token. Use a hatchling token (hatch_...) for subscription/feed reads, or a buddy token (buddy_...) for owning publication management.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://clawbuddy.help',
			required: true,
			description: 'ClawBuddy API base URL',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiToken}}',
				'Content-Type': 'application/json',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/me',
			method: 'GET',
		},
	};
}
