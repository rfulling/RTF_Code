	/**
	Created by Umesh Pokhrel
	02/18/2017
	Version 1.0
	Description
	This integration is called when a Employee record is either created or updated in Netsuite 
	and based on that it creates/updates Employees in Coupa
	**/
	
function userEventAfterSubmit(type) {

	nlapiLogExecution('AUDIT', 'Employee Integration Script Called ', 'type = '
			+ type + ' recordid = ' + nlapiGetRecordId());

	var context = nlapiGetContext();

	var thisEnv = context.getEnvironment();
	var url_test_contains = [ "-dev", "-demo", "-dmo", "-qa", "-sandbox",
			"-sbx", "-stage", "-staging", "-stg", "-support", "-test", "-uat",
			"coupacloud.com", "coupadev.com" ];
	var param_url = nlapiGetContext().getSetting('SCRIPT',
			'custscript_coupa_emp_url');
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
				'custscript_emp_erroremailnotify'), context.getSetting(
				'SCRIPT', 'custscript_emp_accountname')
				+ ' - Error creating/Updating User in Coupa', 'Error Code:'
				+ errorcode + '\n' + 'Error Message:' + errordetails);
		throw error;
	}
	var Isinactive = false;
	
	if (context
			.getSetting('SCRIPT', 'custscript_emp_customfieldincludeonly')) {
		var custfieldincludeonly = context.getSetting('SCRIPT',
				'custscript_emp_customfieldincludeonly');
		var newrecord = nlapiGetNewRecord();
		var oldrecord = nlapiGetOldRecord();

		if (type == 'create') {
			if (newrecord.getFieldValue(custfieldincludeonly) == 'F'
					|| newrecord.getFieldValue(custfieldincludeonly) != 'T') {
				nlapiLogExecution(
						'AUDIT',
						'Skipping Employee creation - - as DO NOT INCLUDE in COUPA set',
						'Employee = ' + newrecord.getFieldValue('entityid')
								+ ' EmployeeId = ' + nlapiGetRecordId());
				return;
			}
		}

		if (type == 'edit') {
			nlapiLogExecution(
						'AUDIT',
						'Employee Edit', 'Edit')
			if (newrecord.getFieldValue(custfieldincludeonly) == 'F'
					&& oldrecord.getFieldValue(custfieldincludeonly) != 'F') {
				Isinactive = true;
			}
			if (newrecord.getFieldValue(custfieldincludeonly) == 'F'
					&& oldrecord.getFieldValue(custfieldincludeonly) == 'F') {
				nlapiLogExecution(
						'AUDIT',
						'Skipping Employee update - as DO NOT INCLUDE in COUPA set',
						'Employee = ' + newrecord.getFieldValue('entityid')
								+ ' EmployeeId = ' + nlapiGetRecordId());
				return;
			}
		}

		if (type == 'delete') {
			Isinactive = true;
		}
	}

	var recordid = nlapiGetRecordId();
	var formatno = context.getSetting('SCRIPT',
			'custscript_emp_phonefaxform');
	var invoiceemails = context.getSetting('SCRIPT',
	'custscript_coupa_emp_emails');
	nlapiLogExecution('DEBUG', 'Invoiceemail = ', invoiceemails);
	var splitvalue = '-';

	var record;
	if (type == 'delete') {
		record = nlapiGetOldRecord();
	} else {
		record = nlapiLoadRecord('employee', recordid);
	}

	// Setting up Headers

	var headers = new Array();
	headers['Accept'] = 'text/xml';
	headers['X-COUPA-API-KEY'] = nlapiGetContext().getSetting('SCRIPT',
			'custscript_emp_apikey');

	nlapiLogExecution('DEBUG','after getting api key');

	var externalid = '';
	var response_status = '';
	var iTimeOutCnt = 0;

	// loop start
	for (var k = 0; k < 1; k++) {

		try {
		
		var userId = getCoupaUser(record.getFieldValue('email'),
				recordid, nlapiGetContext().getSetting('SCRIPT',
				'custscript_coupa_emp_url'), headers);			
			
		var url = nlapiGetContext().getSetting('SCRIPT',
					'custscript_coupa_emp_url')
					+ '/api/users?bulk=1';

			nlapiLogExecution('DEBUG', 'after getting URL', '|' + url + '|');

			var postData = "<?xml version='1.0' encoding='UTF-8'?>"
			+ "<users><user>";

			if (userId != null && userId != "") {
				url = nlapiGetContext().getSetting('SCRIPT',
						'custscript_coupa_emp_url')
						+ '/api/users/' + userId;
				postData = "<?xml version='1.0' encoding='UTF-8'?><user><id>" + userId + "</id>";
				nlapiLogExecution('DEBUG', 'after setting ID', postData);
				nlapiLogExecution('DEBUG', 'after setting ID', url);
			}
			postData = postData + "<login>"
					+ convertCDATA(record.getFieldValue('email'))
					+ "</login>";

			postData = postData + "<email>"
					+ convertCDATA(record.getFieldValue('email'))
					+ "</email>";
						
			postData = postData + "<firstname>"
						+ convertCDATA(record.getFieldValue('firstname'))
						+ "</firstname>";
						
			postData = postData + "<lastname>"
						+ convertCDATA(record.getFieldValue('lastname'))
						+ "</lastname>";						
						
			postData = postData + "<employee-number>"
						+ recordid
						+ "</employee-number>";
							
			postData = postData + "<fullname>"
						+ convertCDATA(record.getFieldValue('firstname')) + ' ' + convertCDATA(record.getFieldValue('lastname'))
						+ "</fullname>";
			
			firstName = record.getFieldValue('firstname');
			lastName = record.getFieldValue('lastname');
			NewFirstName = firstName.replace(/\s+/g, '');
			NewLastName =  lastName.replace(/\s+/g, '');
			
			
			postData = postData + "<mention-name>"
						+ convertCDATA(NewFirstName) + convertCDATA(NewLastName) 
						//+	convertCDATA(record.getFieldValue('lastname'))
						+ "</mention-name>";
						
			postData = postData + "<default-currency> <code>" + GetCurrency(record.getFieldValue('currency')) + "</code> </default-currency>";
			
			postData = postData + "<sso-identifier>"
					+ convertCDATA(record.getFieldValue('email'))
					+ "</sso-identifier>";
					
			//postData = postData + "<approver><next-login>" + "upokhrel@trustwave.com" + "</approver-login></approver>";
			var empSub = record.getFieldValue('subsidiary');
			var empEmail = record.getFieldValue('email');
			nlapiLogExecution('DEBUG', 'empEmail', empEmail);
			
			if(empSub == '44')
			{			
			postData = postData + "<authentication-method>coupa_credentials</authentication-method>";
			}
			else
			{
			postData = postData + "<authentication-method>saml</authentication-method>";
			}
			
			//postData = postData + "<purchasing-user>true</purchasing-user>";
			postData = postData + "<expense-user>true</expense-user>";	
			//postData = postData + "<roles><role><name>Expense User</name></role><role><name>Trustwave User</name> </role></roles>";	
			postData = postData + "<dept_code>" +  convertCDATA(record.getFieldValue('department'))	+ "</dept_code>";
			postData = postData + "<class_code>" + convertCDATA(record.getFieldValue('class')) + "</class_code>";	
			//subsidiary
			postData = postData + "<legal_entity>" + GetSubsidiary(record.getFieldValue('subsidiary')) + "</legal_entity>";	
			postData = postData + "<default-account><account-type><name>" + GetSubsidiary(record.getFieldValue('subsidiary')) +
			"</name></account-type></default-account>";
			//postData = postData + "<default-account><id>1</id></default-account>";
			//var subsidiary = record.getFieldValue('subsidiary');
						
			/*if (empEmail != 'SKelley@trustwave.com' && empEmail != 'lpodmolik@trustwave.com'&& empEmail != 'rmiller@trustwave.com'&& empEmail != 'JKunkel@trustwave.com'&& empEmail != 'dferinga@trustwave.com'&& empEmail != 'ssmith@trustwave.com' && empEmail != 'cspallitta@trustwave.com' && empEmail != 'MBartlett@trustwave.com' && empEmail != 'brucker@trustwavegovt.com')
			{*/
			//}
			
			//postData = postData + "<authentication-method>"	+ convertCDATA("saml") + "</authentication-method>";
			
			var termDate = record.getFieldValue('releasedate');
			nlapiLogExecution('DEBUG', 'term date', termDate );
			//if (record.getFieldValue('isinactive') == 'T')	 
			if ((!termDate) || termDate == null)
			{
				coupaaccess = "true";
			} else {
				coupaaccess = "false";
				postData = postData + "<purchasing-user>false</purchasing-user>";
				postData = postData + "<expense-user>false</expense-user>";	
				
			}
			
			nlapiLogExecution('DEBUG', 'after validating active inactive');

			postData = postData + "<active>" + coupaaccess + "</active>";
			
			var subsidiary = record.getFieldValue('subsidiary');
			//Govt Solutions
			if (subsidiary ==  44)
			{
				govtSolns = "true";
			} else {
				govtSolns = "false";
			}
			
			postData = postData + "<government_solutions_llc>" + govtSolns + "</government_solutions_llc>";
			
			//APAC/LAC
			if (subsidiary == 33 || subsidiary == 32 || subsidiary == 34 || subsidiary == 36 || subsidiary == 19 ||
			subsidiary == 19 || subsidiary == 12 || subsidiary == 21 || subsidiary == 13 || subsidiary == 11  || 
			subsidiary == 18 || subsidiary == 14 || subsidiary == 22 || subsidiary == 23)
			{
				apacLac = "true";
			} else {
				apacLac = "false";
			}			
			postData = postData + "<apac_or_lac>" + apacLac + "</apac_or_lac>";			
						
			//postData = postData + "<roles> <role> <name>Admin</name> </role> </roles>"
			
			var SupervisorEmail = FindSupervisorEmail(record.getFieldValue('supervisor'));
			nlapiLogExecution('DEBUG', 'supervisor = ', record.getFieldValue('supervisor'));
			nlapiLogExecution('DEBUG', 'SupervisorEmail = ', SupervisorEmail);
			
			if (SupervisorEmail == 'RMcCullen@trustwave.com')
			{
				reportingToBob = "true";							
			}			
			else {
				reportingToBob = "false";				
			}
			postData = postData + "<reporting_to_bob>" + reportingToBob + "</reporting_to_bob>";

			if (reportingToBob == 'true')
			{
				postData = postData + "<parent><login>IIordanov@trustwave.com</login></parent>";	
			}
			
			else 
			{
			postData = postData + "<parent><login>" + FindSupervisorEmail(record.getFieldValue('supervisor')) +"</login></parent>";	
			}
									
			if (userId == null || userId == "") {
				postData = postData + "</user></users>";
			} else {
				postData = postData + "</user>";
			}
			
			nlapiLogExecution('DEBUG', 'postData = ', postData);

			var response;
			
			if (userId == null || userId == "") {
				response = nlapiRequestURL(url, postData, headers);
			} else {
				nlapiLogExecution('DEBUG', 'response = ', postData);
				response = nlapiRequestURL(url, postData, headers, 'PUT');
				
			}
			
			nlapiLogExecution('DEBUG', 'response code = ',response.getCode());
			if (response.getCode() == '201' || response.getCode() == '200') {
				var responseXML = nlapiStringToXML(response.getBody());
				 //var file = nlapiCreateFile('searchresults.xml', 'XMLDOC', response.getBody());
		//file.setFolder(25257);
//nlapiSubmitFile(file);
				//var getXmlString = responseXML.text();
				nlapiLogExecution('DEBUG', 'response xml = ', response.getBody());
				response_status = "";
			if (userId != null && userId != "") {
					nlapiLogExecution('DEBUG', 'status = ', response_status);
					response_status = 'SUCCESS';
					externalid = nlapiSelectValue(responseXML, 'user/id');
					nlapiLogExecution('DEBUG', 'external id last = ', externalid);
				} else {
					response_status = nlapiSelectValue(responseXML,
							'results/result/status');
				}
				
				if (response_status == 'SUCCESS') {

					nlapiLogExecution('AUDIT',
							'Successfully created/Updated User in Coupa ',
							'Id = ' + recordid + ' FirstName = '
									+ record.getFieldValue('firstname') + ' LastName = ' + record.getFieldValue('lastname'));
					if (externalid == null || externalid == "") {
						externalid = nlapiSelectValue(responseXML,
								'results/result/unique-keys/id');
					}
					nlapiLogExecution('AUDIT', 'External Id', externalid);

					//record.setFieldValue('externalid', "CoupaUser-"
					//		+ externalid);
					if (type != 'delete') {
						nlapiSubmitRecord(record);
					}
				} else {

					nlapiLogExecution('ERROR',
							'Error creating/Updating User in Coupa ',
							'NetsuiteId = ' + recordid + ' User Name = '
									+ record.getFieldValue('companyname')
									+ response.getBody());

					nlapiSendEmail(-5, context.getSetting('SCRIPT',
							'custscript_vendor_erroremailnotify'), context
							.getSetting('SCRIPT',
									'custscript_emp_acct_name')
							+ ' - Error creating/Updating User in Coupa',
							'Netsuite User ID =' + recordid
									+ ' User Name = '
									+ record.getFieldValue('companyname')
									+ '\n\n' + 'Response Error Below:' + '\n'
									+ response.getBody());

				}

			} else {

				nlapiLogExecution('ERROR',
						'Error creating/Updating User in Coupa ',
						'NetsuiteId = ' + recordid + ' User Name = '
								+ record.getFieldValue('companyname')
								+ ' Response Error Code:' + response.getCode());

				nlapiSendEmail(-5, context.getSetting('SCRIPT',
						'custscript_vendor_erroremailnotify'), context
						.getSetting('SCRIPT', 'custscript_emp_acct_name')
						+ ' - Error creating/Updating User in Coupa',
						'Netsuite User ID =' + recordid + ' User Name = '
								+ record.getFieldValue('companyname')
								+ ' Response Error Code:' + response.getCode());

				// record.setFieldValue('externalid', 'NULL');
				// nlapiSubmitRecord(record);
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
						.getSetting('SCRIPT', 'custscript_emp_acct_name')
						+ ' - Error creating/Updating User in Coupa',
						'Netsuite User ID =' + recordid + ' User Name = '
								+ record.getFieldValue('companyname') + '\n\n'
								+ 'Error Code:' + errorcode + '\n'
								+ 'Error Message:' + errordetails);

			} else {
				nlapiLogExecution('ERROR', 'uncaught error', error);
			}
		} // catch end
	} // loop end

}


function getCoupaUser(userName, userNumber, url, header) {
	var getResponse = '';
	var nameUrl = url + '/api/users?login='
			+ userName.replace(/ /g, '%20');
	var numberUrl = url + '/api/users?employee-number='
			+ userNumber.replace(/ /g, '%20');
	nlapiLogExecution("DEBUG", "userNumber", userNumber);
	nlapiLogExecution("DEBUG", "userName", userName);
	nlapiLogExecution("DEBUG", "nameUrl", nameUrl);
	nlapiLogExecution("DEBUG", "numberUrl", numberUrl);
	getResponse = nlapiRequestURL(nameUrl, null, header, 'GET');
	nlapiLogExecution('DEBUG', 'Name url response code is = ', getResponse
			.getCode());

	if (getResponse.getCode() == '200') {
		var responseXML = nlapiStringToXML(getResponse.getBody());
		var coupaUserId = nlapiSelectValue(responseXML,
				'users/user/id');
		nlapiLogExecution('DEBUG', 'User ID is = ', coupaUserId);
		return coupaUserId;
	} else {
		if (getResponse.getCode() == '404') {
			getNumberResponse = nlapiRequestURL(numberUrl, null, header, 'GET');
			nlapiLogExecution('DEBUG', 'Number url response code is = ',
					getNumberResponse.getCode());
			if (getNumberResponse.getCode() == '200') {
				var responseXML = nlapiStringToXML(getNumberResponse.getBody());
				var coupaUserId = nlapiSelectValue(responseXML,
						'users/user/id');
				nlapiLogExecution('DEBUG', 'User ID is = ', coupaUserId);
				return coupaUserId;
			} else {
				nlapiLogExecution("DEBUG",
						"Failure to retrieve users by number",
						"Response Code: " + getNumberResponse.getCode()
								+ " Body response: "
								+ getNumberResponse.getBody());
			}
		}
		nlapiLogExecution("DEBUG", "Failure to retrieve users by name",
				"Response Code: " + getResponse.getCode() + " Body response: "
						+ getResponse.getBody());
	}
	return null;
}

function CoupaCallBack(response) {
	nlapiLogExecution('DEBUG', 'In fucntion CoupaCallBack');
}

function xmlEncode(string) {
	return string.replace(/\&/g, '&' + 'amp;').replace(/</g, '&' + 'lt;')
			.replace(/>/g, '&' + 'gt;').replace(/\'/g, '&' + 'apos;').replace(
					/\"/g, '&' + 'quot;');
}
function convertCDATA(inputdata) {
	return "<![CDATA[" + inputdata + "]]>";
}

function FindSupervisorEmail(supervisorId){
	var filters = new Array();
	var columns = new Array();
	
	filters[0] = new nlobjSearchFilter('internalid', null, 'is',supervisorId);
	nlapiLogExecution("DEBUG","supervisorId",supervisorId);
	columns[0] = new nlobjSearchColumn('email');
	var results = nlapiSearchRecord('employee',null,filters,columns);	
	supervisorEmail = results[0].getValue('email');
	nlapiLogExecution("DEBUG","EMAIL",supervisorEmail);
	return supervisorEmail;

}

function GetCurrency(currencyId){
	var filters = new Array();
	var columns = new Array();
	
	filters[0] = new nlobjSearchFilter('internalid', null, 'is', currencyId);
	nlapiLogExecution("DEBUG","currencyId",currencyId);
	columns[0] = new nlobjSearchColumn('symbol');
	var results = nlapiSearchRecord('currency', null, filters, columns);
	currencyCode = results[0].getValue('symbol');
	nlapiLogExecution("DEBUG","EMAIL",currencyCode);
	return currencyCode;

}

function GetSubsidiary(subsidiaryId){
	var filters = new Array();
	var columns = new Array();
	
	filters[0] = new nlobjSearchFilter('internalid', null, 'is', subsidiaryId);
	nlapiLogExecution("DEBUG","subsidiaryId",subsidiaryId);
	columns[0] = new nlobjSearchColumn('namenohierarchy');
	var results = nlapiSearchRecord('subsidiary', null, filters, columns);
	subName = results[0].getValue('namenohierarchy');
	nlapiLogExecution("DEBUG","subName",subName);
	return subName;

}





