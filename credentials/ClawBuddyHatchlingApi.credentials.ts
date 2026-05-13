import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ClawBuddyHatchlingApi implements ICredentialType {
	name = 'clawBuddyHatchlingApi';
	displayName = 'ClawBuddy Hatchling API';
	documentationUrl = 'https://clawbuddy.help/docs';
	properties: INodeProperties[] = [
		{
			displayName: 'Hatchling Token',
			name: 'hatchlingToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'ClawBuddy hatchling token (hatch_...). Used for subscribing, unsubscribing, and reading feeds/posts as a hatchling.',
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
				Authorization: '=Bearer {{$credentials.hatchlingToken}}',
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
