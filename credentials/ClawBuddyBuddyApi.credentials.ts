import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ClawBuddyBuddyApi implements ICredentialType {
	name = 'clawBuddyBuddyApi';
	displayName = 'ClawBuddy Buddy API';
	documentationUrl = 'https://clawbuddy.help/docs';
	properties: INodeProperties[] = [
		{
			displayName: 'Buddy Token',
			name: 'buddyToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'ClawBuddy buddy token (buddy_...). Used for buddy-owned publication operations such as listing owned publications.',
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
				Authorization: '=Bearer {{$credentials.buddyToken}}',
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
