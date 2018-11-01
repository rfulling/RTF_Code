	/**
	Created by Umesh Pokhrel
	02/19/2017
	Version 1.0
	Description
	This integration is called when a Project record is either created or updated in Netsuite 
	and based on that it creates/updates Project in Coupa
	**/
	
	function userEventAfterSubmit(type) {

		nlapiLogExecution('AUDIT', 'Project Integration Script Called ', 'type = '
				+ type + ' recordid = ' + nlapiGetRecordId());

		var context = nlapiGetContext();
		var projectinternalid = nlapiGetRecordId();

		var thisEnv = context.getEnvironment();
		var url_test_contains = [ "-dev", "-demo", "-dmo", "-qa", "-sandbox",
				"-sbx", "-stage", "-staging", "-stg", "-support", "-test", "-uat",
				"coupacloud.com", "coupadev.com" ];
		var param_url = nlapiGetContext().getSetting('SCRIPT',
				'custscript_coupa_proj_url');
		// Ensure test url in a non production environment.
		try {
			if (thisEnv != 'PRODUCTION') {
				var test_url = false;
				for (var i = 0; i < url_test_contains.length; i++) {
					if (param_url.indexOf(url_test_contains[i]) > -1) {
						test_url = true;
					}
				}
				if (!test_url) {
					var errMsg = 'Error - script is running in non prod environment and not using a '
							+ url_test_contains
							+ ' in the coupa URL. If you believe this to be incorrect, please contact Coupa Support';
					throw nlapiCreateError('BadEnv', errMsg, false);
				}
			}
		} catch (error) {
			var errordetails;
			errorcode = error.getCode();
			errordetails = error.getDetails() + ".";

			nlapiLogExecution(
					'ERROR',
					'Processing Error - Unable to do Coupa request api call to export Invoices',
					'Error Code = ' + errorcode + ' Error Description = '
							+ errordetails);
			nlapiSendEmail(-5, context.getSetting('SCRIPT',
					'custscript_proj_erroremailnotify'), context.getSetting(
					'SCRIPT', 'custscript_proj_accountname')
					+ ' - Error creating/Updating Project in Coupa', 'Error Code:'
					+ errorcode + '\n' + 'Error Message:' + errordetails);
			throw error;
		}
		var Isinactive = false;
		
		if (context
				.getSetting('SCRIPT', 'custscript_proj_customfieldincludeonly')) {
			var custfieldincludeonly = context.getSetting('SCRIPT',
					'custscript_proj_customfieldincludeonly');
			var newrecord = nlapiGetNewRecord();
			var oldrecord = nlapiGetOldRecord();

			if (type == 'create') {
				if (newrecord.getFieldValue(custfieldincludeonly) == 'F'
						|| newrecord.getFieldValue(custfieldincludeonly) != 'T') {
					nlapiLogExecution(
							'AUDIT',
							'Skipping Project creation - - as DO NOT INCLUDE in COUPA set',
							'Project = ' + newrecord.getFieldValue('entityid')
									+ ' ProjectId = ' + nlapiGetRecordId());
					return;
				}
			}

			if (type == 'edit') {
				nlapiLogExecution(
							'AUDIT',
							'Project Edit', 'Edit')
				if (newrecord.getFieldValue(custfieldincludeonly) == 'F'
						&& oldrecord.getFieldValue(custfieldincludeonly) != 'F') {
					Isinactive = true;
				}
				if (newrecord.getFieldValue(custfieldincludeonly) == 'F'
						&& oldrecord.getFieldValue(custfieldincludeonly) == 'F') {
					nlapiLogExecution(
							'AUDIT',
							'Skipping Project update - as DO NOT INCLUDE in COUPA set',
							'Project = ' + newrecord.getFieldValue('entityid')
									+ ' ProjectId = ' + nlapiGetRecordId());
					return;
				}
			}

			if (type == 'delete') {
				Isinactive = true;
			}
		}

		var recordid = nlapiGetRecordId();
		var formatno = context.getSetting('SCRIPT',
				'custscript_proj_phonefaxform');
		var invoiceemails = context.getSetting('SCRIPT',
		'custscript_coupa_proj_emails');
		var splitvalue = '-';

		var record;
		if (type == 'delete') {
			record = nlapiGetOldRecord();
		} else {
			record = nlapiLoadRecord('job', recordid);
		}

		// Setting up Headers

		var headers = new Array();
		headers['Accept'] = 'text/xml';
		headers['X-COUPA-API-KEY'] = nlapiGetContext().getSetting('SCRIPT',
				'custscript_proj_apikey');

		nlapiLogExecution('DEBUG','after getting api key');

		var externalid = '';
		var response_status = '';
		var iTimeOutCnt = 0;

		// loop start
		for (var k = 0; k < 1; k++) {

			try {
				
				var ProjectId = getCoupaProject(record.getFieldValue('entityid'),
					recordid, nlapiGetContext().getSetting('SCRIPT',
					'custscript_coupa_proj_url'), headers);
				
				nlapiLogExecution('DEBUG', 'Project ID', ProjectId);
					
				var url = nlapiGetContext().getSetting('SCRIPT',
						'custscript_coupa_proj_url')
						+ '/api/lookup_values?bulk=1';

				nlapiLogExecution('DEBUG', 'after getting URL', '|' + url + '|');

				var postData = "<?xml version='1.0' encoding='UTF-8'?>"
				+ "<lookup-values><lookup-value>";

				if (ProjectId != null && ProjectId != "") {
					url = nlapiGetContext().getSetting('SCRIPT',
							'custscript_coupa_proj_url')
							+ '/api/lookup_values/' + ProjectId;
					postData = "<?xml version='1.0' encoding='UTF-8'?><lookup-value><id>" + ProjectId + "</id>";
									
					nlapiLogExecution('DEBUG', 'after setting ID', postData);
					nlapiLogExecution('DEBUG', 'after setting ID', url);
				}
				
		
				postData = postData + "<name>"
						+  convertCDATA(record.getFieldValue('companyname'))
						+ "</name>";

				postData = postData + "<description>"
						+ convertCDATA(record.getFieldValue('companyname'))
						+ "</description>";
							
				postData = postData + "<external-ref-num>"
						+ projectinternalid
						+ "</external-ref-num>";
				
				postData = postData + "<external-ref-code>"
						+ projectinternalid
						+ "</external-ref-code>";
										
					
				if (record.getFieldValue('isinactive') == 'T')
				{
				coupaaccess = "false";
				} else {
				coupaaccess = "true";
				}
			
			nlapiLogExecution('DEBUG', 'after validating active inactive');

			postData = postData + "<active>" + coupaaccess + "</active>";
				
				postData = postData + "<lookup><name>Project</name></lookup>";
											
				nlapiLogExecution('DEBUG', 'after validating active inactive');
					
						
				if (ProjectId == null || ProjectId == "") {
					postData = postData + "</lookup-value></lookup-values>";
				} else {
					postData = postData + "</lookup-value>";
				}
				nlapiLogExecution('DEBUG', 'postData = ', postData);

				var response;
				
				if (ProjectId == null || ProjectId == "") {
					response = nlapiRequestURL(url, postData, headers);
				} else {
					response = nlapiRequestURL(url, postData, headers, 'PUT');
					
				}
				
				nlapiLogExecution('DEBUG', 'response code = ',response.getCode());
				if (response.getCode() == '201' || response.getCode() == '200') {
					var responseXML = nlapiStringToXML(response.getBody());
					nlapiLogExecution('DEBUG', 'response xml = ', response.getBody());
					response_status = "";
				if (ProjectId != null && ProjectId != "") {
					nlapiLogExecution('DEBUG', 'Project id last = ', ProjectId);
						response_status = 'SUCCESS';
						externalid = nlapiSelectValue(responseXML, 'lookup-value/id');
						} else {
						response_status = nlapiSelectValue(responseXML,
								'results/result/status');
					}
					
					if (response_status == 'SUCCESS') {

						nlapiLogExecution('AUDIT',
								'Successfully created/Updated Project in Coupa ',
								'Id = ' + recordid + ' FirstName = '
										+ record.getFieldValue('firstname') + ' LastName = ' + record.getFieldValue('lastname'));
						if (externalid == null || externalid == "") {
							externalid = nlapiSelectValue(responseXML,
									'results/result/unique-keys/id');
						}
						nlapiLogExecution('AUDIT', 'External Id', externalid);
						if (type != 'delete') {
							nlapiSubmitRecord(record);
						}
					} else {

						nlapiLogExecution('ERROR',
								'Error creating/Updating Project in Coupa ',
								'NetsuiteId = ' + recordid + ' Project Name = '
										+ record.getFieldValue('ProjectId')
										+ response.getBody());

						/*nlapiSendEmail(-5, context.getSetting('SCRIPT',
								'custscript_vendor_erroremailnotify'), context
								.getSetting('SCRIPT',
										'custscript_proj_acct_name')
								+ ' - Error creating/Updating Project in Coupa',
								'Netsuite Project ID =' + recordid
										+ ' Project Name = '
										+ record.getFieldValue('ProjectId')
										+ '\n\n' + 'Response Error Below:' + '\n'
										+ response.getBody());*/

					}

				} else {

					nlapiLogExecution('ERROR',
							'Error creating/Updating Project in Coupa ',
							'NetsuiteId = ' + recordid + ' Project Name = '
									+ record.getFieldValue('companyname')
									+ ' Response Error Code:' + response.getCode());

					nlapiSendEmail(-5, context.getSetting('SCRIPT',
							'custscript_vendor_erroremailnotify'), context
							.getSetting('SCRIPT', 'custscript_proj_acct_name')
							+ ' - Error creating/Updating Project in Coupa',
							'Netsuite Project ID =' + recordid + ' Project Name = '
									+ record.getFieldValue('companyname')
									+ ' Response Error Code:' + response.getCode());
				}


			}// try end
			catch (error) {
				if (error instanceof nlobjError) {
					var errordetails;
					errorcode = error.getCode();
					switch (errorcode) {
					case "SSS_REQUEST_TIME_EXCEEDED":
						if (iTimeOutCnt > 2) {
							errordetails = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request). tried to establish connection 3 times and still failed. Please contact Technical Support.";
							exit = true;
							break;
						} else {
							errordetails = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request). retrying to establish a connection.";
							iTimeOutCnt = iTimeOutCnt + 1;
							k = 0;
							break;
						}
					default:
						errordetails = error.getDetails() + ".";
						exit = true;
						break;
					}

					nlapiLogExecution('ERROR', 'Process Error', errorcode + ': '
							+ errordetails);
					nlapiSendEmail(-5, context.getSetting('SCRIPT',
							'custscript_vendor_erroremailnotify'), context
							.getSetting('SCRIPT', 'custscript_proj_acct_name')
							+ ' - Error creating/Updating Project in Coupa',
							'Netsuite Project ID =' + recordid + ' Project Name = '
									+ record.getFieldValue('companyname') + '\n\n'
									+ 'Error Code:' + errorcode + '\n'
									+ 'Error Message:' + errordetails);

				} else {
					nlapiLogExecution('ERROR', 'uncaught error', error);
				}
			} // catch end
		} // loop end

	}


	function getCoupaProject(ProjectName, ProjectNumber, url, header) {
		var getResponse = '';
		var nameUrl = url + '/api/lookup_values?name='
				+ ProjectName.replace(/ /g, '%20');
	var numberUrl = url + '/api/lookup_values?number='
				+ ProjectNumber.replace(/ /g, '%20');
		getResponse = nlapiRequestURL(nameUrl, null, header, 'GET');
		nlapiLogExecution('DEBUG', 'Name url response code is = ', getResponse
				.getCode());

		if (getResponse.getCode() == '200') {
			var responseXML = nlapiStringToXML(getResponse.getBody());
			var coupaUserId = nlapiSelectValue(responseXML,
					'lookup-values/lookup-value/id');
			nlapiLogExecution('DEBUG', 'Project ID is = ', coupaUserId);
			return coupaUserId;
		} else {
			if (getResponse.getCode() == '404') {
				getNumberResponse = nlapiRequestURL(numberUrl, null, header, 'GET');
				nlapiLogExecution('DEBUG', 'Number url response code is = ',
						getNumberResponse.getCode());
				if (getNumberResponse.getCode() == '200') {
					var responseXML = nlapiStringToXML(getNumberResponse.getBody());
					var coupaUserId = nlapiSelectValue(responseXML,
							'lookup-value/id');
					nlapiLogExecution('DEBUG', 'Project ID is = ', coupaUserId);
					return coupaUserId;
				} else {
					nlapiLogExecution("DEBUG",
							"Failure to retrieve Project by number",
							"Response Code: " + getNumberResponse.getCode()
									+ " Body response: "
									+ getNumberResponse.getBody());
				}
			}
			nlapiLogExecution("DEBUG", "Failure to retrieve Project by name",
					"Response Code: " + getResponse.getCode() + " Body response: "
							+ getResponse.getBody());
		}
		return null;
	}

	function CoupaCallBack(response) {
		nlapiLogExecution('DEBUG', 'In function CoupaCallBack');
	}

	function xmlEncode(string) {
		return string.replace(/\&/g, '&' + 'amp;').replace(/</g, '&' + 'lt;')
				.replace(/>/g, '&' + 'gt;').replace(/\'/g, '&' + 'apos;').replace(
						/\"/g, '&' + 'quot;');
	}
	function convertCDATA(inputdata) {
		return "<![CDATA[" + inputdata + "]]>";
	}