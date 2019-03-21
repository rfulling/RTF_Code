// Coupa Expense Order Integration Project
var errmsg;
var ExpenseOrderID;
// TODO: Add logic for posting period and cutoff day here using event/(status of
// approved for payment)created_at
function scheduled(type) {
	// Variable Declaration
	var context = nlapiGetContext();
	var param_url = context.getSetting('SCRIPT', 'custscript_coupa_er_amount_erl');
	var param_APIKey = context.getSetting('SCRIPT', 'custscript_coupa_er_amount_apikey');
	var iTimeOutCnt = 0;
	var headers = new Array();
	var tranid = '';
	headers['Accept'] = 'text/xml';
	headers['X-COUPA-API-KEY'] = param_APIKey;

	var today  = new Date();  
	var yesterday = new Date(today);
	yesterday.setDate(today.getDate() -1);
	var dd = yesterday.getDate();
	var mm = yesterday.getMonth()+1; //January is 0!
	var yyyy = yesterday.getFullYear();
	if(dd<10){dd='0'+dd} if(mm<10){mm='0'+mm} 
	ExpDate = yyyy+'-'+mm+'-'+dd;
	
	var response = '';

	var url = param_url		
		+'/api/expense_reports?exported=true&updated-at[gt]='+ExpDate;

	nlapiLogExecution('DEBUG', 'url', url);
	
	var thisEnv = context.getEnvironment();
	var url_test_contains = [ "-dev", "-demo", "-dmo", "-qa", "-sandbox",
			"-sbx", "-stage", "-staging", "-stg", "-support", "-test", "-uat",
			"coupacloud.com", "coupadev.com" ];
	
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
				'Processing Error - Unable to do Coupa request api call to Find ERs',
				'Error Code = ' + errorcode + ' Error Description = '
						+ errordetails);
		nlapiSendEmail(
				-5,
				nlapiGetContext().getSetting('SCRIPT',
						'custscript_coupa_po_email_addr_notify'),
				nlapiGetContext().getSetting('SCRIPT',
						'custscript_coupa_po_acccountname')
						+ ' Expense Report Integration:Processing Error - Unable to do Coupa request api call to Find ERs',
				'Error Code = ' + errorcode + ' Error Description = '
						+ errordetails);
		throw error;
	}

	try {
		response = nlapiRequestURL(url, null, headers);
		nlapiLogExecution(
				'DEBUG', 'Message', response.getCode());

	} catch (error) {
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
			case 404:
				LogAudit('No new record to export');
				return;
			default:
				errordetails = error.getDetails() + ".";
				exit = true;
				break;
			}
			LogErr('Processing Error - Unable to find Coupa ERs '
					+ 'Expense Report Id = ' + tranid + ' Error code: '
					+ errorcode + 'Error description:' + errordetails);
			nlapiSendEmail(
					-5,
					nlapiGetContext().getSetting('SCRIPT',
							'custscript_coupa_po_email_addr_notify'),
					nlapiGetContext().getSetting('SCRIPT',
							'custscript_coupa_po_acccountname')
							+ ' Invoice Integration:Processing Error - Unable to do Coupa request api call to export Expense Report',
					'Error Code = ' + errorcode + ' Error Description = '
							+ errordetails);
		}
	} // catch end

	if (response.getCode() == 200) {
		LogMsg('response.getCode() is ' + response.getCode());
		var responseXML = nlapiStringToXML(response.getBody());
		LogMsg('body is ' + response.getBody());
		var file = nlapiCreateFile('searchresults.xml', 'XMLDOC', response.getBody());
		file.setFolder(25257);
		nlapiSubmitFile(file);	

		
		var expenseHeaderNode = nlapiSelectNode(responseXML, 'expense-reports');
		var expenseHeaderHeaderNode = new Array();
		//var expensedByNode = new Array();
		expenseHeaderHeaderNode = nlapiSelectNodes(expenseHeaderNode,
				'expense-report');		

		LogMsg('Expense Report to Look at:' + expenseHeaderHeaderNode.length);

		for (var i = 0; i < expenseHeaderHeaderNode.length; i++) {
			var usage = getnumber(context.getRemainingUsage());
			LogAudit('current Usage at: ' + usage);
			if (usage < 1000) {
				LogAudit('Usage Exceeded at: ' + i);
				var status = nlapiScheduleScript(context.getScriptId(), context
						.getDeploymentId());
				if (status == 'QUEUED')
					break;
			}
			
			tranid = nlapiSelectValue(expenseHeaderHeaderNode[i], 'id');
			amount = nlapiSelectValue(expenseHeaderHeaderNode[i], 'total');
			nlapiLogExecution('DEBUG', 'tranid', tranid);
			nlapiLogExecution('DEBUG', 'amount', amount);			
			var expensedByNode = nlapiSelectNode(expenseHeaderHeaderNode[i],'expensed-by');			
			var coupaEmployee = nlapiSelectValue(expensedByNode,'employee-number');
			nlapiLogExecution('DEBUG', 'coupaEmployee', coupaEmployee);
			var expenseExists = 'false';
			expenseExists = findExpenseReport(tranid);			
			if (expenseExists != 'false') 
			{
				var id = findExpenseReport(tranid);
				nlapiLogExecution('DEBUG', 'ER ID:', id);
				var record = nlapiLoadRecord('expensereport', id);
				record.setFieldValue('custbody_coupa_total_amt', amount);
				nlapiSubmitRecord(record);
			}
		}

	}
}

function findExpenseReport(tranid) {
	var filters = new Array();
	var columns = new Array();
	
	filters[0] = new nlobjSearchFilter('custbody_coupa_er_number', null, 'is', tranid);
	filters[1] = new nlobjSearchFilter('custbody_coupa_total_amt', null, 'isempty', null);	
	nlapiLogExecution("DEBUG","tranid",tranid);
	columns[0] = new nlobjSearchColumn('internalid');
	var results = nlapiSearchRecord('transaction', null, filters, columns);
	if (results) {
	internalid = results[0].getValue('internalid');
	nlapiLogExecution("DEBUG","internalid",internalid);
	return internalid;
	}
	else return 'false';
}

function expenseReport(tranid) {
	var filters = new Array();

	filters[0] = new nlobjSearchFilter('custbody_coupa_er_number', null, 'is',
			tranid);
	//filters[1] = new nlobjSearchFilter('employee', null, 'is',
		//	coupaEmployee);
			
	var searchresults = nlapiSearchRecord('expensereport', null, filters);

	if (searchresults && searchresults.length > 0) {

		return searchresults[0].getId();
	} else
		return 'false';

}



var fx = 'Expense Report ';
var fxctr = 100;
var context = nlapiGetContext();
function LogMsg(text) {
	fxctr++;
	nlapiLogExecution('DEBUG', fx + fxctr, text);
}
function LogErr(text) {
	fxctr++;
	nlapiLogExecution('ERROR', fx + fxctr, text);
}
function LogAudit(text) {
	fxctr++;
	nlapiLogExecution('AUDIT', fx + fxctr, text);
}
function getnumber(id) {
	var ret;
	ret = parseFloat(id);
	if (isNaN(ret)) {
		ret = 0;
	}
	return ret;
}// getnumber