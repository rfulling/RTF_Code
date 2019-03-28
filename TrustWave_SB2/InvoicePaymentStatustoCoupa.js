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

	nlapiLogExecution('DEBUG', 'Sending Invoices Payment Status');

	var context = nlapiGetContext();
	var paramvalues = new Array();

	var thisEnv = context.getEnvironment();
	var url_test_contains = [ "-dev", "-demo", "-dmo", "-qa", "-sandbox",
			"-sbx", "-stage", "-staging", "-stg", "-support", "-test", "-uat",
			"coupacloud.com", "coupadev.com" ];
	var param_url = nlapiGetContext().getSetting('SCRIPT',
			'custscript_coupa_send_inv_pay_url');
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
		nlapiSendEmail(-5, nlapiGetContext().getSetting('SCRIPT','custscript_coupa_send_inv_pay_email'), nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_send_inv_pmt_acctname')
				+ ' Invoice Payment Integration:Processing Error - Exception','Error Code = ' + errorcode + ' Error Description = '+ errordetails);
		throw error;
	}

	// setting the search filters

	var filters = new Array();
	var columns = new Array();
	filters[0] = new nlobjSearchFilter('type', null, 'is', 'VendBill');
	filters[1] = new nlobjSearchFilter('mainline', null, 'is', 'T');
	filters[2] = new nlobjSearchFilter('status', null, 'is', 'VendBill:B');
	filters[3] = new nlobjSearchFilter('datecreated', 'applyingtransaction', 'onOrAfter','daysAgo1');
	//filters[4] = new nlobjSearchFilter('custbody_status_sent_to_coupa', null, 'is', 'F');
	//columns
	columns[0] = new nlobjSearchColumn('number');
	columns[1] = new nlobjSearchColumn('datecreated', 'applyingtransaction');
	columns[2] = new nlobjSearchColumn('internalid');
	columns[3] = new nlobjSearchColumn('entity');
	columns[4] = new nlobjSearchColumn('number', 'applyingtransaction');
	columns[5] = new nlobjSearchColumn('fxamount');
	columns[6] = new nlobjSearchColumn('fxamount', 'applyingtransaction');
	// perform search
	var results = nlapiSearchRecord('transaction', null, filters, columns);
	
	if (results) {
		nlapiLogExecution('AUDIT', 'Processing ' + results.length + ' Expense Reports');
	//headers
	var headers = new Array();
		headers['Accept'] = 'text/xml';
		headers['X-COUPA-API-KEY'] = nlapiGetContext().getSetting('SCRIPT','custscript_send_inv_pay_apikey');
	
	
		nlapiLogExecution('DEBUG','after getting api key');

		var externalid = '';
		var response_status = '';
		var iTimeOutCnt = 0;
			
		for (var k = 0; k < results.length; k++)
			{
				CoupaID = results[k].getValue('number');		
				suppliernumber = results[k].getValue('entity');
				tranid = results[k].getValue('number', 'applyingtransaction');
				datecreated = results[k].getValue('datecreated', 'applyingtransaction');
				topayamount = results[k].getValue('fxamount');
				amountpaid = results[k].getValue('fxamount', 'applyingtransaction');
				amountpaidabs = Math.abs(amountpaid);
				var target  = new Date(datecreated);  
				//var PaymentDate = datecreated.getDate();
				var dd = target.getDate();
				var mm = target.getMonth()+1; //January is 0!
				var yyyy = target.getFullYear();
				if(dd<10){dd='0'+dd} if(mm<10){mm='0'+mm} 
				PaymentDate = yyyy+'-'+mm+'-'+dd;
				nlapiLogExecution("DEBUG","CoupaID",CoupaID);
				nlapiLogExecution("DEBUG","PaymentDate",PaymentDate);
				nlapiLogExecution("DEBUG","tranid",tranid);
							
					//Getting Coupa Internal ID for the Invoice
					var CoupaInvoiceID = getCoupaInvoiceId(CoupaID, suppliernumber, tranid, topayamount,datecreated);
						
					url = nlapiGetContext().getSetting('SCRIPT','custscript_coupa_send_inv_pay_url') + '/api/invoices/' + CoupaInvoiceID;
					
				
					var postData = "<?xml version='1.0' encoding='UTF-8'?>"
					+ "<invoice-header>" + "<payment-date>" + PaymentDate + "</payment-date>"
					+ "<paid type='boolean'>true</paid><payments type='array'><payment>"
					+ "<amount-paid type='decimal' nil='true'>"
					+ topayamount
					+ "</amount-paid>"
					+ "<payment-date type='datetime' nil='true'>"
					+ PaymentDate 
					+ "</payment-date>" + "<notes>"
					+ tranid + "</notes>" + "</payment>" + "</payments>"
					+ "</invoice-header>";
					
									
					nlapiLogExecution('DEBUG', 'after setting ID', postData);
					nlapiLogExecution('DEBUG', 'after setting ID', url);
					
					var response;
					response = nlapiRequestURL(url, postData, headers, 'PUT');
					
					nlapiLogExecution('DEBUG', 'response code = ',response.getCode());
					if (response.getCode() == '200')
					{
					nlapiLogExecution('DEBUG', 'Payment Date and Status sent to Coupa successfully');		
					}
					else {
						nlapiLogExecution('ERROR', 'Error updating payments in Coupa');
						//var id = nlapiSubmitRecord(record, true);					
						}
		}
	}
	
}

function getCoupaInvoiceId(invoicenum, suppliernumber, tranid, topayamount,topaydate) {
	var coupaInvoiceId;
	var encoded_invoicenum = encodeURIComponent(invoicenum);

	var url = nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_send_inv_pay_url')+ '/api/invoices?invoice-number='+ encoded_invoicenum
	+ '&&supplier[number]=' + suppliernumber + '&&status=approved';

	var headers = new Array();
	headers['Accept'] = 'text/xml';
	headers['X-COUPA-API-KEY'] = nlapiGetContext().getSetting('SCRIPT',
			'custscript_send_inv_pay_apikey');

	var response = nlapiRequestURL(url, null, headers);
	if (response.getCode() != '200') {
		nlapiLogExecution('DEBUG', 'Error getting CoupaId', 'response code = '
				+ response.getCode() + ' url = ' + url + ' APIKey = '
				+ headers['X-COUPA-API-KEY']);
		return 'INVALID_COUPAID';
	}

	var responseXML = nlapiStringToXML(response.getBody());
	coupaInvoiceId = nlapiSelectValue(responseXML,
			'invoice-headers/invoice-header/id');

	var isPaid = 'false';
	isPaid = nlapiSelectValue(responseXML,
			'invoice-headers/invoice-header/paid');

	if (isPaid == 'true') {
		nlapiLogExecution('DEBUG', 'Invoice already paid', ' Invoice Number = '
				+ invoicenum + ' supplier = ' + suppliernumber);
		return 'INVOICE_PAID';
	}

	var PaymentsNode = nlapiSelectNode(responseXML,'invoice-headers/invoice-header/payments');
	var paymentnode = new Array();
	paymentnode = nlapiSelectNodes(PaymentsNode, 'payment');

	for (var i = 0; i < paymentnode.length; i++) {

		if (nlapiSelectValue(paymentnode[i], 'amount-paid')&& nlapiSelectValue(paymentnode[i], 'payment-date')) {

			var paidamount = parseFloat(nlapiSelectValue(paymentnode[i],'amount-paid'));
			var checknumber = nlapiSelectValue(paymentnode[i], 'notes');
		
			var paiddate = ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(paymentnode[i], 'payment-date'));

			nlapiLogExecution('DEBUG', 'Check for duplicate',
					'Invoice Check = ' + checknumber + ' Netsuite Tranid = '
							+ tranid + ' InvoicePaymentamount = ' + paidamount
							+ ' ToPayAmount = ' + parseFloat(topayamount)
							+ ' Invoicedate = ' + paiddate + ' ToPayDate = '
							+ topaydate);

			if ((paidamount == parseFloat(topayamount))&& (tranid == checknumber) && (paiddate == topaydate)) {
				
				return 'DUPLICATE_PAYMENT';
			}
		}
	}
	nlapiLogExecution('DEBUG', 'Coupa Invoice Id', coupaInvoiceId);
	return coupaInvoiceId;
}

function ConvertCoupaDateToNetSuiteDate(CoupaDate) {
	var nDate = CoupaDate.split('T');
	// nlapiLogExecution('DEBUG', 'date', nDate);

	var datesplit = nDate[0].split('-');

	var Nyear = datesplit[0];
	// nlapiLogExecution('DEBUG', 'year', Nyear);

	var Nday;
	// remove leading zero
	if (datesplit[2].charAt(0) == '0')
		Nday = datesplit[2].slice(1);
	else
		Nday = datesplit[2];

	// nlapiLogExecution('DEBUG', 'day', Nday);
	// remove leading zero
	var Nmonth;
	if (datesplit[1].charAt(0) == '0')
		Nmonth = datesplit[1].slice(1);
	else
		Nmonth = datesplit[1];
	// nlapiLogExecution('DEBUG', 'month', Nmonth);

	var netDate = Nmonth + '/' + Nday + '/' + Nyear;
	// nlapiLogExecution('DEBUG', 'netDate', netDate);
	return netDate;
}