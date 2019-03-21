// Coupa Expense Report Integration Project
var errmsg;
var customFields = new Array();
var customFieldsToSet = new Array();
var ExpenseReportID;
// TODO: Add logic for posting period and cutoff day here using event/(status of
// approved for payment)created_at
function scheduled(type) {
	// Variable Declaration
	var param_url = context.getSetting('SCRIPT', 'custscript_coupa_er_url');
	var param_APIKey = context.getSetting('SCRIPT','custscript_coupa_er_apikey');
	var iTimeOutCnt = 0;
	var headers = new Array();
	var tranid = '';
	headers['Accept'] = 'text/xml';
	headers['X-COUPA-API-KEY'] = param_APIKey;

	var response = '';

	var url = param_url + '/api/expense_reports?status=approved_for_payment&exported=false';
	//var url = param_url + '/api/expense_reports?id=31099'

	if (context.getSetting('SCRIPT' , 'custscript_er_filter')) {
	url = url + context.getSetting('SCRIPT' , 'custscript_er_filter');
	}
	
	var thisEnv = 'PRODUCTION'; //context.getEnvironment();
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
				'Processing Error - Unable to do Coupa request api call to export Expense Reports',
				'Error Code = ' + errorcode + ' Error Description = '
						+ errordetails);
		nlapiSendEmail(
				-5,
				nlapiGetContext().getSetting('SCRIPT','custscript_coupa_er_email_addr_notify'),nlapiGetContext().getSetting('SCRIPT','custscript_coupa_er_acccountname')
						+ ' Expense Report Integration:Processing Error - Unable to do Coupa request api call to export Expense Reports','Error Code = ' + errorcode + ' Error Description = '+ errordetails);
		throw error;
	}
	
	if (context.getSetting('SCRIPT' , 'custscript_exprpts_limit'))
    		url = url + '&limit=' + context.getSetting('SCRIPT' , 'custscript_exprpts_limit');
	
var url = param_url+'/api/expense_reports?&id=23563';//+ invoice_filter;
LogMsg('url: ' + url);

  try {
		response = nlapiRequestURL(url, null, headers);
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
			LogErr('Processing Error - Unable to set export flag '
					+ 'Expense Report Id = ' + tranid + ' Error code: '
					+ errorcode + 'Error description:' + errordetails);
			nlapiSendEmail(
					-5,
					nlapiGetContext().getSetting('SCRIPT',
							'custscript_coupa_er_email_addr_notify'),
					nlapiGetContext().getSetting('SCRIPT',
							'custscript_coupa_er_acccountname')
							+ ' Invoice Integration:Processing Error - Unable to do Coupa request api call to export Expense Report',
					'Error Code = ' + errorcode + ' Error Description = '
							+ errordetails);
		}
	} // catch end

	if (response.getCode() == 200) {
		LogMsg('response.getCode() is ' + response.getCode());
		//var responseXML = nlapiStringToXML(response.getBody());
        var file = nlapiCreateFile('searchresults_23563.xml', 'XMLDOC', response.getBody());
		file.setFolder(25257);
		nlapiSubmitFile(file);
		//responseXML = nlapiStringToXML(nlapiLoadFile(4549373));
		
		var xmlFile = nlapiLoadFile('4549373');
		var xmlDocument = nlapiStringToXML(xmlFile.getValue());
		
		responseXML=xmlDocument
		
//nlapiLogExecution('DEBUG', 'response xml = ', response.getBody());
//		LogMsg('body is ' + response.getBody());

		var expenseHeaderNode = nlapiSelectNode(responseXML, 'expense-reports');
		var expenseHeaderHeaderNode = new Array();
		expenseHeaderHeaderNode = nlapiSelectNodes(expenseHeaderNode,'expense-report');

		LogMsg('Expense Report to Process :' + expenseHeaderHeaderNode.length);

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
			ERamount = nlapiSelectValue(expenseHeaderHeaderNode[i], 'total');

			// var expenseLinesNode =
			// nlapiSelectNode(expenseHeaderHeaderNode[i], 'expense-lines');
			// var expenseLinesLineNode = nlapiSelectNode(expenseLinesNode,
			// 'expense-line');
			// var expensedByNode =nlapiSelectNode(expenseLinesLineNode,
			// 'expensed-by');
			// var entityid = nlapiSelectValue(expensedByNode, 'id');

			var expenseExists = 'true';
			var creditCardExpense = 'false';
			expenseExists = findExpenseReport(tranid);
			LogMsg('Coupa Expense ID is ' + expenseExists);

			if (context.getSetting('SCRIPT','custscript_coupa_er_creditcardskip')) {
				if (context.getSetting('SCRIPT','custscript_coupa_er_creditcardskip') == 'T') {

					var expenseLinesNode = nlapiSelectNodes(expenseHeaderHeaderNode[i], 'expense-lines');
					var expenseLinesLineNode = nlapiSelectNodes(expenseLinesNode[0], 'expense-line');
					var importedNode = nlapiSelectNode(expenseLinesLineNode[0],'expense-line-imported-data');
					if (importedNode != null)
						creditCardExpense = 'true';
				}
			}

			if (expenseExists == 'false' && creditCardExpense == 'false') {
				LogMsg('Expense Report ' + tranid+ ' is not existing in NetSuite');
				var expensecreatereturn = createExpenseReport(expenseHeaderHeaderNode[i], tranid, ERamount);
				if (!expensecreatereturn){					
					nlapiSendEmail(
					-5,
					nlapiGetContext().getSetting('SCRIPT','custscript_coupa_er_email_addr_notify'),
					nlapiGetContext().getSetting('SCRIPT','custscript_coupa_er_acccountname')
							+ ' Invoice Integration:Processing Error - Unable to do Coupa request api call to export Expense Report','Error Code = ' + errorcode + ' Error Description = '
							+ errordetails);
					LogAudit('Error Creating ER: ' + tranid + ', ' + errmsg);
				}
				else {
					LogAudit('Successfully created NetSuite Expense Report: '+ ExpenseReportID + ' for Coupa #: ' + tranid);
				}
			} else {
				if (creditCardExpense) {
					LogMsg('Skipping Expense Report: ' + tranid+ ' as it is a Credit Card Transaction');
				} else {
					LogMsg('Editing is not feasible in Coupa. You are trying to Update Expense Report #:'+ expenseExists);
				}
			}
		}

	}
}

// Setting Purchase Order to true
function setExportedToTrue(id) {

	var headers = new Array();
	headers['Accept'] = 'text/xml';
	headers['X-COUPA-API-KEY'] = nlapiGetContext().getSetting('SCRIPT',
			'custscript_coupa_er_apikey');

	// getting transaction list
	var url = nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_er_url')+ '/api/expense_reports/' + id + '?exported=true';
	var postData = "<?xml version='1.0' encoding='UTF-8'?><expense-report><exported type='boolean'>true</exported></expense-report>";
	var response = '';
	var iTimeOutCnt = 0;

	// loop start
	for (var k = 0; k < 1; k++) {
		// try start
		try {
			response = nlapiRequestURL(url, postData, headers, 'PUT');
		} catch (error) {
			if (error instanceof nlobjError) {
				var errordetails;
				errorcode = error.getCode();
				switch (errorcode) {
				case "INVALID_REF_KEY":
					errordetails = "Reference Key Invalid.";
					return;

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

				LogErr(' Error code:' + errorcode + 'Error description:'
						+ errordetails);
				nlapiSendEmail(
						-5,
						nlapiGetContext().getSetting('SCRIPT',
								'custscript_coupa_er_email_addr_notify'),
						nlapiGetContext().getSetting('SCRIPT',
								'custscript_coupa_er_acccountname')
								+ ' Invoice Integration:Processing Error - Unable to do Coupa request api call to export Expense Report',
						'Error Code = ' + errorcode + ' Error Description = '
								+ errordetails);
			}

		} // catch end

	}// loop end

	if (response.getCode() != '200') {
		LogErr('Coupa Purchase-Order Id = ' + id + ' response failed:'
				+ response.getDetails());
	}

}

// Creating Expense Report when the ER is not yet exported to NetSuite

function createExpenseReport(expenseHeaderHeaderNode, tranid, ERamount) {
	// VARIABLE DECLARATIONS HERE
	// var expenseReportLines = new Array();
	// var expenseExpenseLine = new Array();
	// var coupaEmployee;
	// var coupaERNumber;
	// var tranid;
	var coupaERCustomBody;
	// var totalamount = 0;
	// var expenseDate;
	// var expenseLine_amount;
	// var expenseCategoryNode;
	// var expenseCurrencyCode;
	var expenseCategoryNode;
	var expenseCategoryLine;
	// var accountNode;
	// var verifyRecord;
	var convertedcurr;
	var coupaDept = null;
	var coupaClass = null;
	var coupaLocation = null;
	var corpcard;
	var userName;
	var projectNode;
	var projectNodeId;
	var billable = '';

	// variable declarations
	try {

		var record = nlapiCreateRecord('expensereport');
		// var x = 0;
		var testparam_url = context.getSetting('SCRIPT','custscript_coupa_er_url');
		var testparam_APIKey = context.getSetting('SCRIPT','custscript_coupa_er_apikey');
		// Get Custom Body Parameter value
		var coupaERCustomBody = context.getSetting('SCRIPT','custscript_coupa_er_body');
		// var arrCustBodyList = new Array();
		// var arrTempList = new Array();

		if (coupaERCustomBody) {
			getCustomFields(coupaERCustomBody, expenseHeaderHeaderNode);
		} else {
			LogMsg('No custom Fields');
		}

		// these are global arrays
		var customFieldsLen = customFields.length;
		var customFieldsToSetLen = customFieldsToSet.length;

		if (!customFieldsLen) {
			LogMsg('debug', 'no custom fields to set');
		}

		var expenseLinesNode = new Array();
		expenseLinesNode = nlapiSelectNodes(expenseHeaderHeaderNode,'expense-lines');

		var expenseLinesLineNode = new Array();
		var expensedByNode = new Array();

		// Expense Nodes
		for (var xx = 0; xx < expenseLinesNode.length; xx++) {
			expenseLinesLineNode = nlapiSelectNodes(expenseLinesNode[xx],'expense-line');

			expensedByNode = nlapiSelectNode(expenseHeaderHeaderNode,'expensed-by');
															
			var coupaEmployee = nlapiSelectValue(expensedByNode,'employee-number');
			LogMsg('entered for coupaEmployee ' + coupaEmployee);

			// Get custom columns
			var coupaPOCustomCols = context.getSetting('SCRIPT','custscript_coupa_er_column');

			if (coupaPOCustomCols) {
				getCustomColumn(coupaPOCustomCols, expenseLinesLineNode);
			}
			var customColumnsLen = customColumns.length;
			var customColumnsToSetLen = customColumnsToSet.length;
			
			//This path can be varialbe.   if the are no account allocations then the path =
			//path = '/account-allocations/account'
			//if there are allocations the path is this
			//path = '/account-allocations/account-allocation'
			
			
			
			var path ='/account-allocations/account';
			for (var yy = 0; yy < expenseLinesLineNode.length; yy++) {
				//get the account allocation subNode 
				//if(nlapiSelectNode(nlapiSelectNode(expenseLinesLineNode[yy],'/account-allocations'))){
					//path ='/account-allocations/account-allocation/account';
				//}
					
				var accountNode = nlapiSelectNode(expenseLinesLineNode[yy],'account');
				//var accountNode = nlapiSelectNode(expenseLinesLineNode[yy],path);

				if (accountNode) {
					coupaDept = getCoupaDept(accountNode);
					coupaClass = getCoupaClass(accountNode);
					coupaLocation = getCoupaLocation(accountNode);
					coupaSub = getCoupaSubsidiary(accountNode);
				} else {
					LogMsg('Record has No Account');
				}

				// Executing Expense Sublist
				// Internal Revision
				/*
				 * if (nlapiSelectValue(expenseLinesLineNode[yy],
				 * 'external-src-name')) { var coupaRevisionNumber =
				 * nlapiSelectValue( expenseLinesLineNode[yy],
				 * 'external-src-name');
				 * record.setFieldValue('custbody_coupa_er_internalrevision',
				 * coupaRevisionNumber); } else { errmsg = 'No value for
				 * coupaRevisionNumber for ER#: ' + tranid; coupaRevisionNumber =
				 * null; LogMsg(errmsg); }
				 */
				record.setFieldValue('custbody_coupa_er_internalrevision', 1);

				// Coupa ER ID
				if (nlapiSelectValue(expenseLinesLineNode[yy],
						'expense-report-id')) {
					var coupaERNumber = nlapiSelectValue(
							expenseLinesLineNode[yy], 'expense-report-id');
					record.setFieldValue('custbody_coupa_er_number',
							coupaERNumber);
				} else {
					errmsg = 'No value for coupaERNumber for ER#: ' + tranid;
					coupaERNumber = null;
					LogMsg(errmsg);
				}

				// Title for Memo
				if (nlapiSelectValue(expenseHeaderHeaderNode, 'title')) {
					var coupaTitle = nlapiSelectValue(expenseHeaderHeaderNode,'title');
					record.setFieldValue('memo', coupaTitle);
				} else {
					errmsg = 'No value for coupaTitle for ER#: ' + tranid;
					coupaTitle = "";
					LogMsg(errmsg);
				}

				
				if (yy == 0) {

					var verifiedEmployee;
					if (coupaEmployee) {
						verifiedEmployee = verifyEmployee(coupaEmployee);
					} else {
						errmsg = 'No Employee Number in Coupa.' + tranid;
						LogErr(errmsg);
						return false;
					}

					// Check employee in NetSuite
					if (verifiedEmployee) {
						record.setFieldValue('entity', verifiedEmployee);
					} else {
						errmsg = 'Employee internal ID not found in NetSuite from Expense Report:'
								+ tranid;
						LogErr(errmsg);							
						nlapiSendEmail(	-5,	nlapiGetContext().getSetting('SCRIPT','custscript_coupa_er_email_addr_notify'),	nlapiGetContext().getSetting('SCRIPT',
							'custscript_coupa_er_acccountname')	+ ' Invoice Integration:Unable to Create Expense Report in NetSuite. Please update ' + tranid + 'For Employee Internal ID:' + coupaEmployee, 'Please Activate the Employee in NetSuite');
						record = nlapiLoadRecord('employee', coupaEmployee);
						record.setFieldValue('releasedate', '');
						record.setFieldValue('custentityns_termination_date', '');
						var id = nlapiSubmitRecord(record);									
						return 'invalid employee';
					}

					// Checking for Expense Link
					if (context.getSetting('SCRIPT',
							'custscript_coupa_er_link_field')) {
						record.setFieldValue(context.getSetting('SCRIPT',
								'custscript_coupa_er_link_field'),
								context.getSetting('SCRIPT',
										'custscript_coupa_er_url')
										+ '/expense_reports/'
										+ nlapiSelectValue(
												expenseHeaderHeaderNode, 'id'));
					}

					// Setting posting period
					var eventHeader = nlapiSelectNode(expenseHeaderHeaderNode,'events');
					var events = new Array();
					events = nlapiSelectNodes(eventHeader, 'event');
					var approved_date = nlapiSelectValue(expenseHeaderHeaderNode, 'submitted-at');
					for (var w = 0; w < events.length; w++) {
						if (nlapiSelectValue(events[w], 'status') == 'accounting_review') {
							approved_date = nlapiSelectValue(events[w],'created-at');
						}
					}
					var formattedDate = ConvertCoupaDateToNetSuiteDate(approved_date);
					//var postingPeriodId = calculatePostingPeriod(formattedDate);
					//nlapiLogExecution('DEBUG', 'Date for Posting Period is ',
					//		postingPeriodId);
					
					var postingPeriodId = nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_er_posting_period');	
					nlapiLogExecution('DEBUG', 'Date for Posting Period is ',postingPeriodId);
					
					record.setFieldValue('postingperiod', postingPeriodId);				
					record.setFieldValue('custbody_coupa_total_amt', ERamount);				
					
			/*		
				//corporate cards accounts - umesh 2017-02-15
				corpcard = nlapiSelectNode(expenseHeaderHeaderNode, 'external-source-type');
				userName = nlapiSelectNode(expenseHeaderHeaderNode, 'user-full-name');
				nlapiLogExecution('DEBUG', 'Copr Card is',corpcard);
		
		if (coupaTitle.indexOf('MATTHEW WIDMER') >=0 )
				{
				nlapiLogExecution('DEBUG', 'Coupa Title is ', coupaTitle);
				}

				
				if (corpcard = "corporate_credit_card_vcf4" && coupaTitle.indexOf("TOM MICHAELIS") >=0) {
				record.setFieldValue('account', 8141)
				}
				if (corpcard = "corporate_credit_card_vcf4" && coupaTitle.indexOf("JAMES KUNKEL" )>=0) {
				record.setFieldValue('account', 8138)
				}
				if (corpcard = "corporate_credit_card_vcf4" && coupaTitle.indexOf("KRISTYAN MJOLSNES") >=0) {
				record.setFieldValue('account', 8140)
				}
				if (corpcard = "corporate_credit_card_vcf4" && coupaTitle.indexOf("KEVIN KILRAINE") >=0) {
				record.setFieldValue('account', 10937)
				}
				if (corpcard = "corporate_credit_card_vcf4" && coupaTitle.indexOf("STEVE KELLEY") >=0) {
				record.setFieldValue('account', 8143)
				}
				if (corpcard = "corporate_credit_card_vcf4" && coupaTitle.indexOf("LORDAN LORDANOV") >=0) {
				record.setFieldValue('account', 8136)
				}
				if (corpcard = "corporate_credit_card_vcf4" && coupaTitle.indexOf("SHERRILYN ROQUE") >=0) {
				record.setFieldValue('account', 8137)
				}
				if (corpcard = "corporate_credit_card_vcf4" && coupaTitle.indexOf("JASON SKARIA") >=0) {
				record.setFieldValue('account', 8139)
				}
				if (corpcard = "corporate_credit_card_vcf4" && coupaTitle.indexOf("MATTHEW WIDMER") >=0) {
				var newsub = record.setFieldValue('subsidiary', '40');
				record.setFieldValue('account', 1301)
				}
				if (corpcard = "corporate_credit_card_vcf4" && coupaTitle.indexOf("DELIVERY ASSURANCE") >=0) {
				record.setFieldValue('account', 8144)
				}
				*/
				

					// Setting approvals
					var expenseApproval = context.getSetting('SCRIPT','custscript_coupa_er_approval');
					if (context.getSetting('SCRIPT','custscript_coupa_er_approval')) {

						if (expenseApproval == 'true') {
							expenseApproval = 'T';
						}

						if (expenseApproval == 'false') {
							expenseApproval = 'F';
						}

						if (expenseApproval != null && expenseApproval != "") {
							record.setFieldValue('accountingapproval',expenseApproval);
						} else {
							LogMsg('No Expense Approval Setup.');
						}
					}

					// set multicurrency
					record.setFieldValue('usemulticurrency', 'T');
					//LogMsg(' Multiple currency is enabled. Amount might not be the exact conversion.');

					// Set Field Values From Coupa Expense record
					record.setFieldValue('trandate', formattedDate);
					record.setFieldValue('externalid', 'Coupa-expensereport'
							+ tranid);
					record.setFieldValue('customform', 46);
					
										
					// Set Custom Field Values
					if (customFieldsLen != null && customFieldsToSetLen != null) {
						for (var y = 0; y < parseInt(customFieldsLen); y++) {
							record.setFieldValue(customFieldsToSet[y],customFields[y]);
						}
					}

				} // End of yy == 0

				expenseCategoryNode = nlapiSelectNode(expenseLinesLineNode[yy],'expense-category');				
				expenseCategoryLine = nlapiSelectValue(expenseCategoryNode,'name');
				expenseCategoryId = nlapiSelectValue(expenseCategoryNode,'id');
				projectNode = nlapiSelectNode(expenseLinesLineNode[yy],'project-code');
				projectNodeId = nlapiSelectValue(projectNode,'external-ref-num');			
				LogMsg('entered for expenseCategoryLine ' + expenseCategoryLine);

				var expenseReason = "";
				if (nlapiSelectValue(expenseLinesLineNode[yy], 'reason')) {
					expenseReason = nlapiSelectValue(expenseLinesLineNode[yy],'reason');
					LogMsg('expenseReason: ' + expenseReason);
				} else {
					errmsg = 'No expense reason in Coupa.';
					expenseReason = "";
					LogMsg(errmsg);
				}
				var lineID = nlapiSelectValue(expenseLinesLineNode[yy], 'id');
				var coupaExpDescription = nlapiSelectValue(expenseLinesLineNode[yy], 'description');
				var billable = nlapiSelectValue(expenseLinesLineNode[yy], 'billable');
				var itemizedLine = nlapiSelectValue(expenseLinesLineNode[yy], 'type');
				
				LogMsg(lineID);
								
			//tax umesh
				var TaxNode = nlapiSelectNode(expenseLinesLineNode[yy],'expense-line-taxes');	
			
				if (TaxNode)
				{
				LogMsg(lineID);
				var TaxCodeNode = nlapiSelectNodes(TaxNode, 'expense-line-tax');
				}		
		
			//setting to zero												
				if (itemizedLine != 'ItemizedExpenseLine' && (coupaSub == '25'|| coupaSub == '23') && (expenseCategoryId != '82'))
				{
				nlapiLogExecution('DEBUG', 'itemizedLine', 'Not');
				var TaxAmount = '0';
				for (var x = 0; x < TaxCodeNode.length; x++) {		
				TaxAmount = nlapiSelectValue(TaxCodeNode[x], 'amount');
				nlapiLogExecution('DEBUG', 'TaxAmount', TaxAmount);
				var Tax = nlapiSelectNode(TaxCodeNode[x], 'tax-code');
				//LogMsg('Tax');
				var TaxCode = nlapiSelectValue(Tax, 'code');
				LogMsg(TaxCode);
				if (TaxCode)
					{
				var taxsplit = TaxCode.split(':');
				//LogMsg('Tax split');
				nlapiLogExecution('DEBUG', 'taxsplit0', taxsplit[0]);
				var taxstring = taxsplit[0].toString();				
				//LogMsg('Tax Code ' + taxstring);	
					}
				if (!TaxCode && coupaSub == '23') {
					var taxstring = 'AU Standard Rate';
				}
					
				}	
				}	

				else if (itemizedLine == 'ItemizedExpenseLine')
				{
					nlapiLogExecution('DEBUG', 'itemizedLine', 'yes');
					nlapiLogExecution('DEBUG', 'ItemizedLine', 'Looking at Taxes');
					TaxAmount = '0';			
					taxstring = '';
					
				}
				
				else 
				{					
					nlapiLogExecution('DEBUG', 'Setting Zero for Tax', 'Since There is not Tax Code');
					TaxAmount = '0';			
					taxstring = '';
					
				}			
				
          
				// getting line currency
				convertedcurr = getCoupaCurrency(expenseLinesLineNode[yy]);
		
				LogMsg('entered for convertedcurr ' + convertedcurr);

				// split accounting check
				var splitaccounting = 'FALSE';
				// var actalloc = nlapiSelectNode(expenseLinesLineNode[yy],
				// 'account-allocations');
				var actalloc = nlapiSelectNode(expenseLinesLineNode[yy],'account-allocations');
				var accountallocations = new Array();
				accountallocations = nlapiSelectNodes(actalloc,'account-allocation');
				if (accountallocations.length >= 1) {
					splitaccounting = 'TRUE';

				}
				LogMsg('Split accounting = ' + splitaccounting);

				if (splitaccounting == 'TRUE') {
					for (var i = 0; i < accountallocations.length; i++) {
						var splitLineAmount = parseFloat(nlapiSelectValue(accountallocations[i], 'amount'));
						var acctAllocNode = new Array();
						var accountType;
						var splitConvertedCurr;
						acctAllocNode = nlapiSelectNode(accountallocations[i],'account');

						var splitCoupaDept = getCoupaDept(acctAllocNode);
						var splitCoupaClass = getCoupaClass(acctAllocNode);
						var splitCoupaLocation = getCoupaLocation(acctAllocNode);

						if (acctAllocNode.length) {
							accountType = nlapiSelectNode(acctAllocNode,'account-type');
							splitConvertedCurr = getCoupaCurrency(accountType);
							LogMsg('entered for splitConvertedCurr '+ splitConvertedCurr);
						}
				
						record.selectNewLineItem('expense');
						record.setCurrentLineItemValue('expense','expensedate',ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(expenseLinesLineNode[yy],'expense-date')));
						//umesh updating amount net of VAT						
					if (splitLineAmount == '0')
					{	
					LogMsg('setting amount to 1 when 0');
						splitLineAmount = 0.01;
					}
					LogMsg('Amount ' +  splitLineAmount);
						//umesh taking amount net of vat
					if ((splitLineAmount) && coupaSub == '25')
					{
					if
					(expenseCategoryId == '11' || expenseCategoryId == '13'  || expenseCategoryId == '6'   ||expenseCategoryId == '14'   || expenseCategoryId == '66'  || expenseCategoryId ==	'69' || expenseCategoryId == '51'  || expenseCategoryId == '12' || expenseCategoryId == '33' || expenseCategoryId == '74')
					{
						//var TaxMinusVat = splitLineAmount - TaxAmount;												
						nlapiLogExecution(
									'DEBUG', 'Tax Category Amount 691', splitLineAmount);
						if (TaxAmount){		
						var TaxVat = splitLineAmount - TaxAmount						
						var netAmount = TaxVat * 0.13;
						var n = netAmount.toFixed(2);
						var TaxMinusVat = splitLineAmount - n;												
						//var ItemizedTax = netAmount * netTax;	
						nlapiLogExecution(
									'DEBUG', 'Net Amount Amount 699', n);						
						record.setCurrentLineItemValue('expense','amount', TaxMinusVat.toFixed(2));						
						}
						else if (!TaxAmount){																		
						nlapiLogExecution(
									'DEBUG', 'No Tax Amount', splitLineAmount);						
						record.setCurrentLineItemValue('expense','amount', splitLineAmount);
							
						}							
					}
					else if ((expenseCategoryId != '11' || expenseCategoryId != '13'  || expenseCategoryId != '6'   ||expenseCategoryId != '14'   || expenseCategoryId != '66'  || expenseCategoryId !=	'69' || expenseCategoryId != '51'  || expenseCategoryId != '12' || expenseCategoryId != '33') || expenseCategoryId != '74' &&  (TaxAmount))						
						 {
							var TaxNetVat = splitLineAmount - TaxAmount;
							nlapiLogExecution(
									'DEBUG', 'TaxNetVat713', TaxNetVat);					
							record.setCurrentLineItemValue('expense',
									'amount', TaxNetVat);						
						}
						else {																		
						nlapiLogExecution(
									'DEBUG', 'No Tax Amount 719', splitLineAmount);						
						record.setCurrentLineItemValue('expense','amount', splitLineAmount);							
						}					
					}
						
					
					//Australia
					if ((splitLineAmount) && coupaSub == '23')
					{
					if
					(expenseCategoryId == '11' || expenseCategoryId == '13'  || expenseCategoryId == '6'   ||expenseCategoryId == '14'   || expenseCategoryId == '66'  || expenseCategoryId ==	'69' || expenseCategoryId == '51'  || expenseCategoryId == '12' || expenseCategoryId == '33' || expenseCategoryId == '74')
					{
						//var TaxMinusVat = splitLineAmount - TaxAmount;												
						nlapiLogExecution(
									'DEBUG', 'Tax Category Amount 733', splitLineAmount);
						if (TaxAmount){		
						var TaxVat = splitLineAmount - TaxAmount						
						var netAmount = TaxVat * 0.10;
						var n = netAmount.toFixed(2);
						var TaxMinusVat = splitLineAmount - n;												
						//var ItemizedTax = netAmount * netTax;	
						nlapiLogExecution(
									'DEBUG', 'Net Amount Amount 741', n);						
						record.setCurrentLineItemValue('expense','amount', TaxMinusVat.toFixed(2));						
						}
						else if (!TaxAmount){																		
						nlapiLogExecution(
									'DEBUG', 'No Tax Amount Australia 746', splitLineAmount);						
						record.setCurrentLineItemValue('expense','amount', splitLineAmount);
							
						}							
					}
					else if ((expenseCategoryId != '11' || expenseCategoryId != '13'  || expenseCategoryId != '6'   ||expenseCategoryId != '14'   || expenseCategoryId != '66'  || expenseCategoryId !=	'69' || expenseCategoryId != '51'  || expenseCategoryId != '12' || expenseCategoryId != '33') || expenseCategoryId != '74'&&  (TaxAmount))						
						 {
							var TaxNetVat = splitLineAmount - TaxAmount;
							nlapiLogExecution(
									'DEBUG', 'TaxNetVat755', TaxNetVat);					
							record.setCurrentLineItemValue('expense',
									'amount', TaxNetVat);						
						}
						else {																		
						nlapiLogExecution(
									'DEBUG', 'No Tax Amount Australia 761', splitLineAmount);						
						record.setCurrentLineItemValue('expense','amount', splitLineAmount);							
						}					
					}					
					
					if(splitLineAmount && (coupaSub == '1' || coupaSub == '44' || coupaSub == '40' || coupaSub == '27' || coupaSub == '24' || coupaSub == '43')){
						
							record.setCurrentLineItemValue('expense',
									'foreignamount', splitLineAmount);
					}				
					
					else if (splitLineAmount && (!taxstring)) {
						record.setCurrentLineItemValue('expense',
								'foreignamount', splitLineAmount);
						record.setCurrentLineItemValue('expense', 'amount',
								splitLineAmount);						
					}
				
					else {
							LogMsg('No Amount in Coupa.');
						}

						if (expenseCategoryLine) {
							record.setCurrentLineItemText('expense',
									'category', expenseCategoryLine);
						} else {
							LogMsg('No Category in Coupa.');
						}

						// if(splitConvertedCurr){
						if (convertedcurr) {
							// record.setCurrentLineItemValue('expense','currency',splitConvertedCurr);
							record.setCurrentLineItemValue('expense',
									'currency', convertedcurr);
						} else {
							LogMsg('No Currency in Coupa.');
						}

						if (lineID) {
							record.setCurrentLineItemValue('expense',
									'custcol_coupa_er_lineid', lineID);
						} else {
							LogMsg('No Line ID in Coupa.');
						}

						if (coupaExpDescription) {
							record.setCurrentLineItemValue('expense',
									'custcol_coupa_er_desc',
									coupaExpDescription);
						} else {
							LogMsg('No Expense Description in Coupa.');
						}
						
						//billable
						if (billable) {
							if (billable == 'T' || billable != 'F')
							{
							record.setCurrentLineItemValue('expense',
									'isbillable',
									'T');
							}
							else 
							{
								record.setCurrentLineItemValue('expense',
									'isbillable',
									'F');
							}
						}
							else {
							LogMsg('No Billable Flag in Coupa.');
						}
						
							
						if (expenseReason) {
							record.setCurrentLineItemValue('expense',
									'custcol_coupa_er_reason', expenseReason);
							record.setCurrentLineItemValue('expense', 'memo',
									expenseReason);
						} else {
							LogMsg('No Reject Reason in Coupa.');
						}

						// dept
						if (nlapiGetContext().getSetting('SCRIPT',
								'custscript_coupa_er_deptseg')) {
							if (coupaDept != null && coupaDept != "") {
								record.setCurrentLineItemValue('expense','department', splitCoupaDept);
							} else {
								LogMsg('Coupa Department not found.');
							}
						}

						// class

						if (coupaClass) {
							if (coupaClass != null && coupaClass != "") {
								record.setCurrentLineItemValue('expense',
										'class', splitCoupaClass);
							} else {
								LogMsg('Coupa class not Found.');
							}
						}

						// location

						if (context.getSetting('SCRIPT',
								'custscript_coupa_er_locseg')) {
							if (coupaLocation != null && coupaLocation != "") {
								record.setCurrentLineItemValue('expense',
										'location', splitCoupaLocation);
							} else {
								LogMsg('Coupa Location not found.');
							}
						}
						
						// Customer or Project
						if (projectNodeId) {
							if (projectNodeId != null && projectNodeId != "") {
								record.setCurrentLineItemValue('expense',
										'customer', projectNodeId);
							} else {
								LogMsg('Coupa Project Not Found.');
							}
						}
						

						// Set Custom Column
						LogMsg('customColumnsLen ' + customColumnsLen
								+ ' customColumnsToSetLen '
								+ customColumnsToSetLen);

						if (customColumnsLen != null
								&& customColumnsToSetLen != null) {

							for (var y = yy; y < parseInt(customColumnsLen); y = y + expenseLinesLineNode.length) {
								// var currentLine =
								// nlapiGetCurrentLineItemIndex('expense');
								var valuecustfield = "";
								LogMsg('current field num ' + y);
								//LogMsg('currentLine Value'
								//		+ customColumns[currentLine]);

								// for(var y=0; y<parseInt(currentLine); y++){

								if (customColumns[y] == 'true') {
									valuecustfield = 'T';
								} else if (customColumns[y] == 'false') {
									valuecustfield = 'F';
								} else if (customColumns[y] == null
										|| customColumns[y] == "") {
									valuecustfield = "";
								} else {
									valuecustfield = customColumns[y];
								}
								LogMsg('customColumnsToSet[y] '
										+ customColumnsToSet[y]
										+ ' valuecustfield ' + valuecustfield);
								record.setCurrentLineItemValue('expense',
										customColumnsToSet[y], valuecustfield);

							} // end of FOR that goes through each custom
							// columns
						} // end of IF that goes through each custom columns

						// Checking for Receipt field
						if (context.getSetting('SCRIPT',
								'custscript_coupa_er_recpt_check') == 'T') {
							var artifactHeader = nlapiSelectNode(
									expenseLinesLineNode[yy],
									'expense-artifacts');
							var artifact = nlapiSelectNodes(artifactHeader,
									'expense-artifact/id');
							var valueToSet = "T";
							if (artifact == null || artifact == "") {
								valueToSet = "F";
							}
							record.setCurrentLineItemValue('expense', 'receipt',
									valueToSet);
						}

						record.commitLineItem('expense');
					}
				}// end of TRUE for split account

				else {
				
					expenseLineAmount = nlapiSelectValue(
							expenseLinesLineNode[yy], 'amount');
					LogMsg('entered for expenseLineAmount ' + expenseLineAmount);

					// if(convertedcurr){
					// var lineID =
					// nlapiSelectValue(expenseLinesLineNode[yy],'parent-expense-line-id');

					record.selectNewLineItem('expense');
					record.setCurrentLineItemValue('expense', 'expensedate',
							ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(
									expenseLinesLineNode[yy], 'expense-date')));

					//umesh taking amount net of vat
					if ((expenseLineAmount) && coupaSub == '25')
					{
					if
					(expenseCategoryId == '11' || expenseCategoryId == '13'  || expenseCategoryId == '6'   ||expenseCategoryId == '14'   || expenseCategoryId == '66'  || expenseCategoryId ==	'69' || expenseCategoryId == '51'  || expenseCategoryId == '12' || expenseCategoryId == '33' || expenseCategoryId == '74')
					{
						//var TaxMinusVat = splitLineAmount - TaxAmount;												
						nlapiLogExecution(
									'DEBUG', 'Tax Category Amount 905', expenseLineAmount);
						if (TaxAmount){		
						var TaxVat = expenseLineAmount - TaxAmount						
						var netAmount = TaxVat * 0.13;
						var n = netAmount.toFixed(2);
						var TaxMinusVat = expenseLineAmount - n;												
						//var ItemizedTax = netAmount * netTax;	
						nlapiLogExecution(
									'DEBUG', 'Net Amount Amount 917', n);						
						record.setCurrentLineItemValue('expense','amount', TaxMinusVat.toFixed(2));						
						}
						else if (!TaxAmount){																		
						nlapiLogExecution(
									'DEBUG', 'No Tax Amount', expenseLineAmount);						
						record.setCurrentLineItemValue('expense','amount', expenseLineAmount);
							
						}							
					}
					else if ((expenseCategoryId != '11' || expenseCategoryId != '13'  || expenseCategoryId != '6'   ||expenseCategoryId != '14'   || expenseCategoryId != '66'  || expenseCategoryId !=	'69' || expenseCategoryId != '51'  || expenseCategoryId != '12' || expenseCategoryId != '33') || expenseCategoryId != '74' &&  (TaxAmount))						
						 {
							var TaxNetVat = expenseLineAmount - TaxAmount;
							nlapiLogExecution(
									'DEBUG', 'TaxNetVat931', TaxNetVat);					
							record.setCurrentLineItemValue('expense',
									'amount', TaxNetVat);						
						}
						else {																		
						nlapiLogExecution(
									'DEBUG', 'No Tax Amount 937', expenseLineAmount);						
						record.setCurrentLineItemValue('expense','amount', expenseLineAmount);							
						}					
					}
						
					
					//Australia
					if ((expenseLineAmount) && coupaSub == '23')
					{
					if
					(expenseCategoryId == '11' || expenseCategoryId == '13'  || expenseCategoryId == '6'   ||expenseCategoryId == '14'   || expenseCategoryId == '66'  || expenseCategoryId ==	'69' || expenseCategoryId == '51'  || expenseCategoryId == '12' || expenseCategoryId == '33' || expenseCategoryId == '74'  || expenseCategoryId == '78')
					{
						//var TaxMinusVat = splitLineAmount - TaxAmount;	
						nlapiLogExecution(
									'DEBUG', 'Tax Amount', TaxAmount);
						nlapiLogExecution(
									'DEBUG', 'Tax Category Amount 951', expenseLineAmount);
						if (TaxAmount){		
						var TaxVat = expenseLineAmount - TaxAmount						
						var netAmount = TaxVat * 0.10;
						var n = netAmount.toFixed(2);
						var TaxMinusVat = expenseLineAmount - n;												
						//var ItemizedTax = netAmount * netTax;	
						nlapiLogExecution(
									'DEBUG', 'Net Amount Amount 959', n);						
						record.setCurrentLineItemValue('expense','amount', TaxMinusVat.toFixed(2));						
						}
						else if (!TaxAmount){																		
						nlapiLogExecution(
									'DEBUG', 'No Tax Amount Australia 964', expenseLineAmount);						
						record.setCurrentLineItemValue('expense','amount', expenseLineAmount);
							
						}							
					}
					else if ((expenseCategoryId != '11' || expenseCategoryId != '13'  || expenseCategoryId != '6'   ||expenseCategoryId != '14'   || expenseCategoryId != '66'  || expenseCategoryId !=	'69' || expenseCategoryId != '51'  || expenseCategoryId != '12' || expenseCategoryId != '33') || expenseCategoryId != '74'&&  (TaxAmount))						
						 {
							var TaxNetVat = expenseLineAmount - TaxAmount;
							nlapiLogExecution(
									'DEBUG', 'TaxNetVat972', TaxNetVat);					
							record.setCurrentLineItemValue('expense',
									'amount', TaxNetVat);						
						}
						else {																		
						nlapiLogExecution(
									'DEBUG', 'No Tax Amount Australia 979', expenseLineAmount);						
						record.setCurrentLineItemValue('expense','amount', expenseLineAmount);							
						}					
					}					
					
					if(expenseLineAmount && (coupaSub == '1' || coupaSub == '44' || coupaSub == '40' || coupaSub == '27' || coupaSub == '24' || coupaSub == '43')){
							record.setCurrentLineItemValue('expense',
									'foreignamount', expenseLineAmount);
					}				

					else if (expenseLineAmount && (!taxstring)) {
						record.setCurrentLineItemValue('expense',
								'foreignamount', expenseLineAmount);
						record.setCurrentLineItemValue('expense', 'amount',
								expenseLineAmount);
					}					
				
					
					else {
						LogMsg('No Amount in Coupa.');
					}

					if (expenseCategoryLine) {
						record.setCurrentLineItemText('expense', 'category',
								expenseCategoryLine);
					} else {
						LogMsg('No Category in Coupa.');
					}
					if (convertedcurr) {
						record.setCurrentLineItemValue('expense', 'currency',
								convertedcurr);
					} else {
						LogMsg('No Currency in Coupa.');
					}

					if (lineID) {
						record.setCurrentLineItemValue('expense',
								'custcol_coupa_er_lineid', lineID);
					} else {
						LogMsg('No Line ID in Coupa.');
					}

					if (coupaExpDescription) {
						record.setCurrentLineItemValue('expense',
								'custcol_coupa_er_desc', coupaExpDescription);
					} else {
						LogMsg('No Expense Description in Coupa.');
					}
					
					//billable
						if (billable) {
							if (billable == 'T' || billable != 'F')
							{
							record.setCurrentLineItemValue('expense',
									'isbillable',
									'T');
							}
							else 
							{
								record.setCurrentLineItemValue('expense',
									'isbillable',
									'F');
							}
						}
							else {
							LogMsg('No Billable Flag in Coupa.');
						}
					
					if (expenseReason) {
						record.setCurrentLineItemValue('expense',
								'custcol_coupa_er_reason', expenseReason);
						record.setCurrentLineItemValue('expense', 'memo',
								expenseReason);
					} else {
						LogMsg('No Reject Reason in Coupa.');
					}

					// dept
					if (context.getSetting('SCRIPT','custscript_coupa_er_deptseg')) {
						if (coupaDept != null && coupaDept != "") {
							record.setCurrentLineItemValue('expense','department', coupaDept);
						} else {
							LogMsg('Coupa Department not found.');
						}
					}
				
					//umesh for Tax
					LogMsg('882');
					//Canada VAT
					if (coupaSub == '25')
					{		
						if ((!taxstring)  || TaxAmount == '0' || TaxAmount == '0.0' || (!TaxAmount))
						{
						nlapiLogExecution('DEBUG', 'Canada Tax', 'Null');
						record.setCurrentLineItemValue('expense', 'taxcode', 98);	
						}
						
					else if ((taxstring) && (TaxAmount != '0' || TaxAmount != '0.0') && (expenseCategoryId == '11' || expenseCategoryId == '13'  || expenseCategoryId == '6'   || expenseCategoryId == '14'   || expenseCategoryId == '66'  || expenseCategoryId ==
					'69' || expenseCategoryId == '51'  || expenseCategoryId == '12' ))
					{
						nlapiLogExecution(
									'DEBUG', 'Canada Tax For Itemized Category', expenseCategoryId);
						record.setCurrentLineItemValue('expense', 'taxcode', 9520);	
					}
					
					else if (taxstring)
						{
						nlapiLogExecution(
									'DEBUG', 'Canada Tax', taxsplit[0]);
						record.setCurrentLineItemValue('expense', 'taxcode', getTaxGroupId(taxstring));						
						}
						
					/*if (expenseCategoryId == '11' || expenseCategoryId == '13'  || expenseCategoryId == '6'   || expenseCategoryId == '14'   || expenseCategoryId == '66'  || expenseCategoryId ==
					'69' || expenseCategoryId == '51'  || expenseCategoryId == '12'     )
					{
						nlapiLogExecution(
									'DEBUG', 'Canada Tax For Itemized Category', taxsplit[0]);
						record.setCurrentLineItemValue('expense', 'taxcode', getTaxGroupId(taxstring));	
					}*/								
					
					}
					
					//Australia
					if (coupaSub == '23')
					{		
						if ((!taxstring)  || TaxAmount == '0' || TaxAmount == '0.0' || (!TaxAmount))
						{
						nlapiLogExecution('DEBUG', 'Australia Tax', 'Null');
						record.setCurrentLineItemValue('expense', 'taxcode', 77);	
						}
						
					else if ((taxstring) && (TaxAmount != '0' || TaxAmount != '0.0') && (expenseCategoryId == '11' || expenseCategoryId == '13'  || expenseCategoryId == '6'   || expenseCategoryId == '14'   || expenseCategoryId == '66'  || expenseCategoryId ==
					'69' || expenseCategoryId == '51'  || expenseCategoryId == '12' ))
					{
						nlapiLogExecution(
									'DEBUG', 'Australia Tax For Itemized Category', expenseCategoryId);
						record.setCurrentLineItemValue('expense', 'taxcode', 21866);	
					}
					
					else if (taxstring)
						{
						nlapiLogExecution(
									'DEBUG', 'Australia Tax Not Null', taxsplit[0]);
						record.setCurrentLineItemValue('expense', 'taxcode', getTaxCodeId(taxstring));						
						}		
					
					
					}					
					
					else if (taxstring && coupaSub != '25' && coupaSub != '23' && coupaSub != '1' ) {							
						nlapiLogExecution(
									'DEBUG', 'Non Canada / Australia Tax', taxsplit[0]);
							record.setCurrentLineItemValue('expense',
									'taxcode', getTaxCodeId(taxstring));						
					}
					
					//setting to zero
					TaxAmount = 0;
					TaxCode = '';	
					taxstring = '';			
					taxsplit = '';					
					
					
					if (coupaClass) {
						if (coupaClass != null && coupaClass != "") {
							
							
							record.setCurrentLineItemValue('expense', 'class',
									coupaClass);
						} else {
							LogMsg('Coupa class not Found.');
						}
					}
					
						// Customer or Project
						if (projectNodeId) {
							if (projectNodeId != null && projectNodeId != "") {
								record.setCurrentLineItemValue('expense',
										'customer', projectNodeId);
							} else {
								LogMsg('Coupa Project Not Found.');
							}
						}

					// location

					if (context.getSetting('SCRIPT',
							'custscript_coupa_er_locseg')) {
						if (coupaLocation != null && coupaLocation != "") {
							record.setCurrentLineItemValue('expense',
									'location', coupaLocation);
						} else {
							LogMsg('Coupa Location not found.');
						}
					}

					// Set Custom Column
					LogMsg('customColumnsLen ' + customColumnsLen
							+ ' customColumnsToSetLen ' + customColumnsToSetLen);
					// var valuecustfield = "";

					if (customColumnsLen != null
							&& customColumnsToSetLen != null) {
						// var currentLine =
						// nlapiGetCurrentLineItemIndex('expense');
						for (var y = yy; y < parseInt(customColumnsLen); y = y + expenseLinesLineNode.length) {
							LogMsg('current filed number ' + y);
							LogMsg('currentLine Value ' + customColumns[y]);
							var valuecustfield = "";
							// for(var y=0; y<parseInt(currentLine); y++){

							// for(var y=0; y<parseInt(customColumnsLen); y++){

							if (customColumns[y] == 'true') {
								valuecustfield = 'T';
							} else if (customColumns[y] == 'false') {
								valuecustfield = 'F';
							} else if (customColumns[y] == null
									|| customColumns[y] == "") {
								valuecustfield = "";
							} else {
								valuecustfield = customColumns[y];
							}
							LogMsg('customColumnsToSet[y] '
									+ customColumnsToSet[y]
									+ ' valuecustfield ' + valuecustfield);
							record.setCurrentLineItemValue('expense',
									customColumnsToSet[y], valuecustfield);

						} // end of FOR that goes through each custom columns
					} // end of IF that goes through each custom columns

					// Checking for Receipt field
					if (context.getSetting('SCRIPT',
							'custscript_coupa_er_recpt_check') == 'T') {
						var artifactHeader = nlapiSelectNode(
								expenseLinesLineNode[yy], 'expense-artifacts');
						var artifact = nlapiSelectNodes(artifactHeader,
								'expense-artifact/id');
						var valueToSet = 'T';
						if (artifact == null || artifact == "") {
							valueToSet = 'F';
						}
						record.setCurrentLineItemValue('expense', 'receipt',
								valueToSet);
					}
					record.commitLineItem('expense');

				} // end of FALSE Split Account

			}// end of for loop for expense lines

		} // end of main for loop that goes through each Expense

		// }
		try {
			ExpenseReportID = nlapiSubmitRecord(record, true, true);
		} catch (error) {
			var expenseExists = findExpenseReport(tranid);
			if (expenseExists != 'false') {
				LogMsg('NetSuite Expense Report Created: ' + tranid
						+ ' and updating export flag');
				setExportedToTrue(tranid);
				return true;
			} else {
				errmsg = getErrorDetails(error);
				return false;
			}
		} // catch

		setExportedToTrue(tranid);
		return true;
	} catch (error) {

		errmsg = getErrorDetails(error);
		return false;
	}
}

function calculatePostingPeriod(invoiceDate) {
	var postingPeriodId = null;

	var filters = [];
	var columns = [];

	filters.push(new nlobjSearchFilter('enddate', null, 'onorafter',
			invoiceDate));
	filters.push(new nlobjSearchFilter('aplocked', null, 'is', 'F'));
	filters.push(new nlobjSearchFilter('closed', null, 'is', 'F'));
	filters.push(new nlobjSearchFilter('isquarter', null, 'is', 'F'));
	filters.push(new nlobjSearchFilter('isyear', null, 'is', 'F'));

	columns.push(new nlobjSearchColumn('startdate').setSort());

	var search = nlapiCreateSearch('accountingperiod', filters, columns);
	var result = search.runSearch().getResults(0, 1); // returns only the
	// first result of the
	// search which is the
	// first available
	// unlocked period

	if (result != null && result.length > 0)
		postingPeriodId = result[0].getId();

	if (!postingPeriodId) {
		var filters1 = [];
		var columns1 = [];

		filters1.push(new nlobjSearchFilter('startdate', null, 'onorbefore',
				invoiceDate));
		filters1.push(new nlobjSearchFilter('aplocked', null, 'is', 'F'));
		filters1.push(new nlobjSearchFilter('closed', null, 'is', 'F'));
		filters1.push(new nlobjSearchFilter('isquarter', null, 'is', 'F'));
		filters1.push(new nlobjSearchFilter('isyear', null, 'is', 'F'));

		columns1.push(new nlobjSearchColumn('enddate').setSort(true));

		var search1 = nlapiCreateSearch('accountingperiod', filters1, columns1);
		var result1 = search1.runSearch().getResults(0, 1); // returns only the
		// first result of
		// the search which
		// is the first
		// available
		// unlocked period

		if (result1 != null && result1.length > 0)
			postingPeriodId = result1[0].getId();
	}

	return postingPeriodId;
}

function getCoupaDept(accountNode) {
	var deptsegment = nlapiGetContext().getSetting('SCRIPT','custscript_coupa_er_deptseg');
	if (deptsegment) {
		var split_dept = nlapiSelectValue(accountNode, deptsegment);
		var dept = split_dept.split(':');
		if (!dept[1]) {
			LogMsg('Coupa Department NOT Found');
			return null;
		} else {
			LogMsg('Coupa Department:' + dept[1]);
			return dept[1];
		}

	}

}

function getCoupaClass(accountNode) {
	var classsegment = nlapiGetContext().getSetting('SCRIPT',
			'custscript_coupa_er_classseg');
	if (classsegment) {
		var split_class = nlapiSelectValue(accountNode, classsegment);
		var classs = split_class.split(':');
		if (!classs[1]) {
			LogMsg('Coupa Class NOT Found');
			return null;
		} else {
			LogMsg('Coupa Class:' + classs[1]);
			return classs[1];
		}
	}
}

function getCoupaLocation(accountNode) {
	var locsegment = nlapiGetContext().getSetting('SCRIPT',
			'custscript_coupa_er_locseg');
	if (locsegment) {
		var split_loc = nlapiSelectValue(accountNode, locsegment);
		var location = split_loc.split(':');

		if (!location[1]) {
			LogMsg('Coupa Location NOT Found');
			return null;
		} else {
			LogMsg('Coupa Location:' + location[1]);
			return location[1];
		}

	}
}

function ConvertCoupaDateToNetSuiteDate(CoupaDate)// OK_Loy
{
	var nDate = CoupaDate.split('T');

	var datesplit = nDate[0].split('-');

	var Nyear = datesplit[0];
	//if (Nyear == '1017')
	//{Nyear = '2017'};

	var Nday = datesplit[2];

	var Nmonth = datesplit[1];

	var netDate = Nmonth + '/' + Nday + '/' + Nyear;

	return netDate;
}

// finding if Expense Report is existing will return the ID if found, will
// return false if not found
function findExpenseReport(tranid) {
	var filters = new Array();

	filters[0] = new nlobjSearchFilter('custbody_coupa_er_number', null, 'is',
			tranid);

	var searchresults = nlapiSearchRecord('expensereport', null, filters);

	if (searchresults && searchresults.length > 0) {

		return searchresults[0].getId();
	} else
		return 'false';

}

function verifyEmployee(verifiedEmployee) {
	var customField = context.getSetting('SCRIPT',
			'custscript_coupa_er_employee_num');
	var column = "";
	if (customField == null || customField == '') {
		column = 'internalid';
		LogMsg("Using standard comparison for employee; internalid");
	} else {
		column = customField;
		LogMsg("Custom employee field used: " + column);
	}
	var filters = new Array();
	filters.push(new nlobjSearchFilter(column, null, 'is', verifiedEmployee));
	filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	filters.push(new nlobjSearchFilter('releasedate', null, 'isempty', null));

	var searchresults = nlapiSearchRecord('employee', null, filters);
	if (!searchresults) {
		return null;
	}
	return searchresults[0].getId();

}

function getCustomFields(coupaERCustomBody, expenseHeaderHeaderNode) {
	var custbody_val = new Array();
	var arrCustBodyList = new Array();
	// var arrTempList = new Array();

	if (coupaERCustomBody != null || coupaERCustomBody != "") {
		custbody_val = coupaERCustomBody.split(";");
		var ctr = 0;
		for (var y = 0; y < custbody_val.length; y++) {
			arrCustBodyList = custbody_val[y].split("==");
			for (var x = 0; x < arrCustBodyList.length; x++) {

				// set array values only if x=0
				if (x == 0) {
					// customFields.push(arrCustBodyList[0]);
					var valueSet = nlapiSelectValue(expenseHeaderHeaderNode,
							arrCustBodyList[0]);
					if (valueSet.indexOf("\n") > -1) {
						valueSet = nlapiSelectValue(expenseHeaderHeaderNode,
								arrCustBodyList[0] + '/external-ref-num');
					}
					customFields[ctr] = valueSet;
					customFieldsToSet[ctr] = arrCustBodyList[1];
					ctr++;
				}
			}
		}
	}

}

// Get custom column list
var customColumns = new Array();
var customColumnsToSet = new Array();

function getCustomColumn(coupaERCustomCols, expenseLinesLineNode) {
	var custcol_val = new Array();
	var arrCustColsList = new Array();

	if (coupaERCustomCols != null || coupaERCustomCols != "") {
		custcol_val = coupaERCustomCols.split(";");
		var ctr = 0;
		var valueSet;
		for (var y = 0; y < custcol_val.length; y++) {
			arrCustColsList = custcol_val[y].split("==");
			for (var x = 0; x < arrCustColsList.length; x++) {
				// Format is valueInCoupa==Netsuiteid;valueInCoupa2==NetSuiteID
				// etc
				// set array values only if x=0
				if (x == 0) {
					for (var xx = 0; xx < expenseLinesLineNode.length; xx++) {
						valueSet = nlapiSelectValue(expenseLinesLineNode[xx],
								arrCustColsList[0]);
						if (valueSet.indexOf("\n") > -1) {
							valueSet = nlapiSelectValue(
									expenseLinesLineNode[xx],
									arrCustColsList[0] + '/external-ref-num');
						}
						if (valueSet != "" && valueSet != null) {
							customColumns[ctr] = valueSet;
							customColumnsToSet[ctr] = arrCustColsList[1];
							ctr++;
						}
					}

				}
			}
		}
	}

}

function getCoupaDept(accountNode) {
	var deptsegment = nlapiGetContext().getSetting('SCRIPT',
			'custscript_coupa_er_deptseg');
	if (deptsegment) {
		var split_dept = nlapiSelectValue(accountNode, deptsegment);

		var dept = split_dept.split(':');
		if (dept.length == 1) {
			LogMsg('getCoupaDept return: ' + dept);
			return dept;
		}
		LogMsg('getCoupaDept return: ' + dept[1]);
		return dept[1];
	}

}

function getCoupaClass(accountNode) {
	var classsegment = nlapiGetContext().getSetting('SCRIPT',
			'custscript_coupa_er_classseg');
	if (classsegment) {
		var split_class = nlapiSelectValue(accountNode, classsegment);
		var classs = split_class.split(':');
		if (classs.length == 1) {
			LogMsg('getCoupaClass return:' + classs);
			return classs;
		}
		LogMsg('getCoupaClass return:' + classs[1]);

		return classs[1];
	}
}

function getCoupaLocation(accountNode) {
	var locsegment = nlapiGetContext().getSetting('SCRIPT',
			'custscript_coupa_er_locseg');
	if (locsegment) {
		var split_loc = nlapiSelectValue(accountNode, locsegment);
		var location = split_loc.split(':');
		if (location.length == 1) {
			LogMsg('getCoupaLocation return:' + location);
			return location;
		}
		LogMsg('getCoupaLocation return:' + location[1]);
		return location[1];
	}
}

function getCoupaSubsidiary(accountNode) {
	// if subsidiary needed test account has no subsidiary
	var subsegment = nlapiGetContext().getSetting('SCRIPT',
			'custscript_coupa_er_subsseg');
	if (subsegment) {
		var split_sub = nlapiSelectValue(accountNode, subsegment);
		var subsidiary = split_sub.split(':');
		if (subsidiary.length == 1) {
			LogMsg('getCoupaSubsidiary return: ' + subsidiary);
			return subsidiary;
		}
		LogMsg('getCoupaSubsidiary return: ' + subsidiary[1]);
		return subsidiary[1];
	}
}

function getCoupaCurrency(expenseLinesLineNode) {
	var currencyNode;
	var currency_now;
	var converted_currency;
	currencyNode = nlapiSelectNode(expenseLinesLineNode, 'currency');
	currency_now = nlapiSelectValue(currencyNode, 'code');
	converted_currency = getNetsuiteCurrency('currency', currency_now);
	
	return converted_currency;
}

function getNetsuiteCurrency(objectinternalid, objectname) {
	// nlapiLogExecution('DEBUG', 'Before getting id via search',
	// 'internalobjectid = ' + objectinternalid + ' objectname = ' +
	// objectname);
	var searchresults;
	var filters = new Array();
	filters.push(new nlobjSearchFilter('symbol', null, 'is', objectname));
	filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	try {
		searchresults = nlapiSearchRecord(objectinternalid, null, filters);
	} catch (e) {
		var error = e.getDetails();
		if (error
				.indexOf("The feature 'Multiple Currencies' required to access this page is not enabled in this account") > -1) {
			nlapiLogExecution('DEBUG', "multiple currencys not enabled",
					'Defaulting currency ID to 1');
			return 1;
		}
	}
	// nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search
	// record', coupaTerm);

	// if (searchresults.length !=1)
	if (!searchresults) {
		nlapiLogExecution('Error', 'Error getting ID for',
				'internalobjectid = ' + objectinternalid + ' objectname =  '
						+ objectname);
		return 'INVALID_NAME';
	}
	// nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search
	// record', searchresults[0].getId());

	return searchresults[0].getId();
}

function getErrorDetails(error) {
	if (error instanceof nlobjError) {
		var errordetails;
		errorcode = error.getCode();
		switch (errorcode) {
		case "INVALID_REF_KEY":
			errordetails = "Reference Key Invalid.";
			return errordetails;

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

		LogErr('Error code: ' + errorcode + ', Error description: '
				+ errordetails + ', Error String: ' + error.toString());
		nlapiSendEmail(
				-5,
				nlapiGetContext().getSetting('SCRIPT',
						'custscript_coupa_er_email_addr_notify'),
				nlapiGetContext().getSetting('SCRIPT',
						'custscript_coupa_er_acccountname')
						+ ' Invoice Integration:Processing Error - Unable to do Coupa request api call to export Invoices',
				'Error Code = ' + errorcode + ' Error Description = '
						+ errordetails);
		return errordetails;
	}

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

function getTaxGroupId(taxName) {
	var filters = new Array();
	var columns = new Array();
	
	filters[0] = new nlobjSearchFilter('name', null, 'is', taxName);
	nlapiLogExecution("DEBUG","taxName",taxName);
	columns[0] = new nlobjSearchColumn('internalid');
	var results = nlapiSearchRecord('taxgroup', null, filters, columns);
	if (!results) 
		{
		nlapiLogExecution('Error', 'Error getting ID for tax group under function getTaxGroupId', taxName);
		return 'INVALID_TAXCODE';
	}	
	else {
		internalid = results[0].getValue('internalid');
		nlapiLogExecution("DEBUG","internalid",internalid);
		return internalid;
	}	
}

function getTaxCodeId(taxName) {
	var filters = new Array();
	var columns = new Array();
	
	filters[0] = new nlobjSearchFilter('name', null, 'is', taxName);
	nlapiLogExecution("DEBUG","TaxCode",taxName);
	columns[0] = new nlobjSearchColumn('internalid');
	var results = nlapiSearchRecord('salestaxitem', null, filters, columns);
	if (!results) 
		{
		nlapiLogExecution('Error', 'Error getting ID for tax Code under function getTaxGroupId', taxName);
		return 'INVALID_TAXCODE';
	}	
	else {
		internalid = results[0].getValue('internalid');
		nlapiLogExecution("DEBUG","internalid",internalid);
		return internalid;
	}	
}