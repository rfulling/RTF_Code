/**
 * Module Description
 * This integration posts vendor payments from netsuite into Coupa
 *
 */

/**
 * @param {String}
 *            type Context Types: scheduled, ondemand, userinterface, aborted,
 *            skipped
 * @returns {Void}
 */
function scheduled(type) {

	nlapiLogExecution('DEBUG', 'Sending Payment Status');

	var context = nlapiGetContext();
	var paramvalues = new Array();

	var thisEnv = context.getEnvironment();
	var url_test_contains = [ "-dev", "-demo", "-dmo", "-qa", "-sandbox",
			"-sbx", "-stage", "-staging", "-stg", "-support", "-test", "-uat",
			"coupacloud.com", "coupadev.com" ];
	var param_url = nlapiGetContext().getSetting('SCRIPT',
			'custscript_coupa_send_pay_url_er');
	//var fromdate = context.getSetting('SCRIPT',
	//		'custscript_coupa_pay_fromdate');
	//var todate = context.getSetting('SCRIPT', 'custscript_coupa_pay_todate');

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
		nlapiSendEmail(-5, nlapiGetContext().getSetting('SCRIPT',
				'custscript_coupa_send_pay_email_er'), nlapiGetContext()
				.getSetting('SCRIPT', 'custscript_coupa_send_pay_acccountname')
				+ ' Invoice Payment Integration:Processing Error - Exception',
				'Error Code = ' + errorcode + ' Error Description = '
						+ errordetails);
		throw error;
	}

	// setting the search filters

	var filters = new Array();
	var columns = new Array();
	//filters
	filters[0] = new nlobjSearchFilter('custrecord_coupa_er_number', null, 'isnotempty', null);
	filters[1] = new nlobjSearchFilter('custrecord_coupa_er_paid_flag', null, 'is', 'F');
	//columns
	columns[0] = new nlobjSearchColumn('custrecord_coupa_er_number');
	columns[1] = new nlobjSearchColumn('internalid');
	columns[2] = new nlobjSearchColumn('custrecord_coupa_er_paid_date');
	// perform search
	var results = nlapiSearchRecord('customrecord_coupa_paid_er', null, filters, columns);
	
	if (results) {
		nlapiLogExecution('AUDIT', 'Processing ' + results.length
				+ ' Expense Reports');
	//headers
	var headers = new Array();
		headers['Accept'] = 'text/xml';
		headers['X-COUPA-API-KEY'] = nlapiGetContext().getSetting('SCRIPT',
				'custscript_send_pay_apikey_er');
				
		nlapiLogExecution('DEBUG','after getting api key');

		var externalid = '';
		var response_status = '';
		var iTimeOutCnt = 0;
			
		for (var k = 0; k < results.length; k++)
			{
				CoupaID = results[k].getValue('custrecord_coupa_er_number');		
				datecreated = results[k].getValue('custrecord_coupa_er_paid_date');
				internalid = results[k].getValue('internalid');
				var target  = new Date(datecreated);  
				var dd = target.getDate();
				var mm = target.getMonth()+1; //January is 0!
				var yyyy = target.getFullYear();
				PaymentDate = yyyy+'-'+mm+'-'+dd;
				nlapiLogExecution("DEBUG","CoupaID",CoupaID);
				nlapiLogExecution("DEBUG","PaymentDate",PaymentDate);
							
					url = nlapiGetContext().getSetting('SCRIPT','custscript_coupa_send_pay_url_er') + '/api/expense_reports/' + CoupaID;
		
					postData = "<?xml version='1.0' encoding='UTF-8'?><expense-report><id>" + CoupaID + "</id>";
					postData = postData + "<payment><payment-date>"+ PaymentDate + "</payment-date></payment>";
					postData = postData + "<paid>true</paid></expense-report>";
									
					nlapiLogExecution('DEBUG', 'after setting ID', postData);
					nlapiLogExecution('DEBUG', 'after setting ID', url);
					
					var response;
					response = nlapiRequestURL(url, postData, headers, 'PUT');
					
					nlapiLogExecution('DEBUG', 'response code = ',response.getCode());
					
					//Update the Record as Paid
					var record = nlapiLoadRecord('customrecord_coupa_paid_er', internalid);
					nlapiLogExecution('DEBUG', 'recordid', record);	
					record.setFieldValue('custrecord_coupa_er_paid_flag','T');
					if (response.getCode() == '200')
					{
					nlapiLogExecution('DEBUG', 'Payment Date and Status sent to Coupa successfully');		
					var id = nlapiSubmitRecord(record, true);			
					}
					else {
						nlapiLogExecution('ERROR', 'Error updating payments in Coupa');								
						}
		}
	}
	
}
