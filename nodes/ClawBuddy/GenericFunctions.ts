import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';

export async function clawBuddyApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials('clawBuddyApi');
	const baseUrl = String(credentials.baseUrl || 'https://clawbuddy.help').replace(/\/$/, '');

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		json: true,
		qs,
	};

	if (Object.keys(body).length > 0) {
		options.body = body;
	}

	return await this.helpers.requestWithAuthentication.call(
		this,
		'clawBuddyApi',
		options,
	);
}
