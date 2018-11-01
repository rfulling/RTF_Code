	/**
	Created by Umesh Pokhrel
	03/18/2017
	Version 1.0
	Description
	This integration is called when Coupa Purchase Order is created and needs to integrate over to NS depending on who created it.
	**/
//check into dev
var errmsg;
var customFields = new Array();
var customFieldsToSet = new Array();
var PurchaseOrderID;

// TODO: Add logic for posting period and cutoff day here using event/(status of
// approved for payment)created_at
function scheduled(type) {
	// Variable Declaration
	var param_url = context.getSetting('SCRIPT', 'custscript_coupa_po_url');
	var param_APIKey = context.getSetting('SCRIPT',
			'custscript_coupa_po_apikey');
	var iTimeOutCnt = 0;
	var headers = new Array();
	var tranid = '';
	headers['Accept'] = 'text/xml';
	headers['X-COUPA-API-KEY'] = param_APIKey;

	var today  = new Date();  
	var yesterday = new Date(today);
	yesterday.setDate(today.getDate() -5);
	var dd = yesterday.getDate();
	var mm = yesterday.getMonth()+1; //January is 0!
	var yyyy = yesterday.getFullYear();
	if(dd<10){dd='0'+dd} if(mm<10){mm='0'+mm} 
	POdate = yyyy+'-'+mm+'-'+dd;
	
	var response = '';

	var url = param_url
		+ '/api/purchase_orders?status=issued&exported=false&created-at[gt]='+POdate;		

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
				'Processing Error - Unable to do Coupa request api call to export Purchase Orders',
				'Error Code = ' + errorcode + ' Error Description = '
						+ errordetails);
		nlapiSendEmail(
				-5,
				nlapiGetContext().getSetting('SCRIPT',
						'custscript_coupa_po_email_addr_notify'),
				nlapiGetContext().getSetting('SCRIPT',
						'custscript_coupa_po_acccountname')
						+ ' Purchase Report Integration:Processing Error - Unable to do Coupa request api call to export Purchase Orders',
				'Error Code = ' + errorcode + ' Error Description = '
						+ errordetails);
		throw error;
	}
	
	if (context.getSetting('SCRIPT' , 'custscript_exprpts_limit'))
		url = url + '&limit=' + context.getSetting('SCRIPT' , 'custscript_exprpts_limit');
	
	LogMsg('url: ' + url);
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
			LogErr('Processing Error - Unable to set export flag '
					+ 'Purchase Report Id = ' + tranid + ' Error code: '
					+ errorcode + 'Error description:' + errordetails);
			nlapiSendEmail(
					-5,
					nlapiGetContext().getSetting('SCRIPT',
							'custscript_coupa_po_email_addr_notify'),
					nlapiGetContext().getSetting('SCRIPT',
							'custscript_coupa_po_acccountname')
							+ ' Invoice Integration:Processing Error - Unable to do Coupa request api call to export Purchase Report',
					'Error Code = ' + errorcode + ' Error Description = '
							+ errordetails);
		}
	} // catch end

	if (response.getCode() == 200) {
		LogMsg('response.getCode() is ' + response.getCode());
		var responseXML = nlapiStringToXML(response.getBody());

		LogMsg('body is ' + response.getBody());
		//var file = nlapiCreateFile('searchresults.xml', 'XMLDOC', response.getBody());
		//file.setFolder(25257);
        //nlapiSubmitFile(file);
	

		var purchaseHeaderNode = nlapiSelectNode(responseXML, 'order-headers');
		
		var purchaseHeaderHeaderNode = new Array();
		purchaseHeaderHeaderNode = nlapiSelectNodes(purchaseHeaderNode,
				'order-header');

		LogMsg('Purchase Order to Process :' + purchaseHeaderHeaderNode.length);

		for (var i = 0; i < purchaseHeaderHeaderNode.length; i++) {
			var usage = getnumber(context.getRemainingUsage());
			LogAudit('current Usage at: ' + usage);
			if (usage < 1000) {
				LogAudit('Usage Exceeded at: ' + i);
				var status = nlapiScheduleScript(context.getScriptId(), context
						.getDeploymentId());
				if (status == 'QUEUED')
					break;
			}

			tranid = nlapiSelectValue(purchaseHeaderHeaderNode[i], 'id');


			var poExists = 'true';
			//var creditCardExpense = 'false';
			poExists = findPurchaseOrder(tranid);
			LogMsg('Coupa Purchase Order ID is ' + poExists);

			if (poExists == 'false') {
				LogMsg('Purchase Order ' + tranid
						+ ' does not exist in NetSuite');
				var pocreatereturn = createPurchaseOrder(
						purchaseHeaderHeaderNode[i], tranid);
				if (!pocreatereturn)
					LogAudit('Error Creating ER: ' + tranid + ', ' + errmsg);
				else {
					LogAudit('Successfully created NetSuite Purchase Order: '
							+ PurchaseOrderID + ' for Coupa #: ' + tranid);
				}
			} else {
				LogMsg('Editing is not feasible in Coupa. You are trying to Update Purchase Order #:'
							+ poExists);
			}
		}

	}
}

// Setting Purchase Order to true
function setExportedToTrue(id) {

	var headers = new Array();
	headers['Accept'] = 'text/xml';
	headers['X-COUPA-API-KEY'] = nlapiGetContext().getSetting('SCRIPT',
			'custscript_coupa_po_apikey');

	// getting transaction list
	var url = nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_po_url')
			+ '/api/purchase_orders/' + id + '?exported=true';
	var postData = "<?xml version='1.0' encoding='UTF-8'?><order-header><exported type='boolean'>true</exported></order-header>";
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
								'custscript_coupa_po_email_addr_notify'),
						nlapiGetContext().getSetting('SCRIPT',
								'custscript_coupa_po_acccountname')
								+ ' Invoice Integration:Processing Error - Unable to do Coupa request api call to export Purchase Order',
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

// Creating Purchase Order when the ER is not yet exported to NetSuite

function createPurchaseOrder(purchaseHeaderHeaderNode, tranid) {
	// VARIABLE DECLARATIONS HERE
	var PurchaseOrderID;
	var expenseCategoryNode;
	var expenseCategoryLine;
	var convertedcurr;
	var coupaDept = null;
	var coupaClass = null;
	var coupaLocation = null;
	var corpcard;
	var userName;

	// variable declarations
	try {

		var record = nlapiCreateRecord('purchaseorder');
		// var x = 0;
		var testparam_url = context.getSetting('SCRIPT',
				'custscript_coupa_po_url');
		var testparam_APIKey = context.getSetting('SCRIPT',
				'custscript_coupa_po_apikey');
		// Get Custom Body Parameter value
		var PurchaseOrderID = context.getSetting('SCRIPT',
				'custscript_coupa_po_body');
		// var arrCustBodyList = new Array();
		// var arrTempList = new Array();
		nlapiLogExecution('DEBUG', 'Message',
							PurchaseOrderID);
		

		if (PurchaseOrderID) {
			getCustomFields(PurchaseOrderID, purchaseHeaderHeaderNode);
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
		expenseLinesNode = nlapiSelectNodes(purchaseHeaderHeaderNode,
				'order-lines');
		//empLinesNode = nlapiSelectNodes(purchaseHeaderHeaderNode,
			//	'employee-number');
		//employeeexpenseLinesNode = nlapiSelectNodes(empLinesNode,
			//	'requester');
	
		var expenseLinesLineNode = new Array();
		var expensedByNode = new Array();

		// Expense Nodes
		for (var xx = 0; xx < expenseLinesNode.length; xx++) {
			//Getting Nodes
			expenseLinesLineNode = nlapiSelectNodes(expenseLinesNode[xx],
					'order-line');
				
			expensedByNode = nlapiSelectNode(purchaseHeaderHeaderNode,
					'requested-by');
			
			requesterNode = nlapiSelectNode(purchaseHeaderHeaderNode,
							'requisition-header/requested-by');
					
			vendorNode = nlapiSelectNode(purchaseHeaderHeaderNode,
					'supplier');	
						
			accountaccountNode = nlapiSelectNode(expenseLinesLineNode[xx],
					'account/account-type');	

			shipAddressNode = nlapiSelectNode(purchaseHeaderHeaderNode,
					'ship-to-address');	
			
			shipCountryNode = nlapiSelectNode(purchaseHeaderHeaderNode,
					'ship-to-address/country');
			
				
			//Define the fields
			var shipName =  nlapiSelectValue(shipAddressNode,'name');
			var shipCompany =  nlapiSelectValue(shipAddressNode,'name');
			
			var streetAdd = nlapiSelectValue(shipAddressNode,'street1') + '' + nlapiSelectValue(shipAddressNode,'street2');
			
			var CityStateZipAdd = nlapiSelectValue(shipAddressNode,'city') + ', ' + nlapiSelectValue(shipAddressNode,'state') + ', (' + nlapiSelectValue(shipCountryNode, 'code') + '), ' + nlapiSelectValue(shipAddressNode,'postal-code');
				
			var coupaAccount = nlapiSelectValue(accountaccountNode,
					'name');
			
			LogMsg(coupaAccount);
					
			var coupaVendor = nlapiSelectValue(vendorNode,
					'number');
			
			LogMsg(coupaVendor);
			
			var CoupaPONum =  nlapiSelectValue(purchaseHeaderHeaderNode,'po-number');
			
			var coupaEmployee = nlapiSelectValue(requesterNode, 'employee-number'); 
				
			//var coupaEmployee = nlapiSelectValue(expensedByNode,
				//	'employee-number');
					
			LogMsg('entered for coupaEmployee ' + coupaEmployee);

			// Get custom columns
			var coupaPOCustomCols = context.getSetting('SCRIPT',
					'custscript_coupa_po_column');

			if (coupaPOCustomCols) {
				getCustomColumn(coupaPOCustomCols, expenseLinesLineNode);
			}
			var customColumnsLen = customColumns.length;
			var customColumnsToSetLen = customColumnsToSet.length;

			for (var yy = 0; yy < expenseLinesLineNode.length; yy++) {
				var accountNode = nlapiSelectNode(expenseLinesLineNode[yy],
						'account');

				if (accountNode) {
					coupaDept = getCoupaDept(accountNode);
					coupaClass = getCoupaClass(accountNode);
					coupaLocation = getCoupaLocation(accountNode);
					coupaSubsidiary = getCoupaSubsidiary(accountNode);
					LogMsg('Account Sub ' + coupaSubsidiary);
				} else {
					LogMsg('Record has No Account');
				}

				// Executing Expense Sublist
				// Internal Revision
				record.setFieldValue('custbody_coupa_po_internalrevision', 1);

				// Coupa PO ID
				if (nlapiSelectValue(expenseLinesLineNode[yy],
						'po-number')) {
					//var coupaPONumber = nlapiSelectValue(
						//	expenseLinesLineNode[yy], 'po-number');
					record.setFieldValue('custbody_coupa_po_number',
							CoupaPONum);
				} else {
					errmsg = 'No value for coupaPONumber for PO#: ' + tranid;
					coupaPONumber = null;
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
						record.setFieldValue('employee', verifiedEmployee);
						record.setFieldValue('custbodyrequest_by_employee', verifiedEmployee);			
							nlapiLogExecution('DEBUG', 'verfied employee ',
							verifiedEmployee);
					} else {
						errmsg = 'Employee internal ID not found in NetSuite from Purchase Order:'
								+ tranid;
						LogErr(errmsg);
						continue;
					}

					// Setting Headers
					var eventHeader = nlapiSelectNode(purchaseHeaderHeaderNode,
							'requisition-header');
					//var events = new Array();
					//events = nlapiSelectNodes(eventHeader, 'event');
					var approved_date = nlapiSelectValue(eventHeader, 'created-at');
					nlapiLogExecution('DEBUG', 'date ',	approved_date);
					var formattedDate = ConvertCoupaDateToNetSuiteDate(approved_date);
					var potype = nlapiSelectValue(expenseLinesLineNode[yy], 'purchase-request-type')
					LogMsg(potype);
					if (potype)
					{
						if (verifiedEmployee == '154258' || verifiedEmployee == '1314')
						{
					var purchasetype = nlapiSelectValue(expenseLinesLineNode[yy], 'purchase-request-type');
					LogMsg(purchasetype);
					LogMsg('Inside the loop 1');						
						}
					}	
										
					// set multicurrency
					record.setFieldValue('usemulticurrency', 'T');
					LogMsg(' Multiple currency is enabled. Amount might not be the exact conversion.');

					// Set Field Values From Coupa Expense record
					record.setFieldValue('entity', coupaVendor);
					LogMsg(coupaVendor);
					record.setFieldValue('custbody_coupa_po_number', CoupaPONum);
					var subsidiary = record.setFieldValue('subsidiary', coupaSubsidiary);
					LogMsg(subsidiary);
					record.setFieldValue('custbodyshiptoaddress', streetAdd);
					record.setFieldValue('custbodyship_to_city_state', CityStateZipAdd);
					record.setFieldValue('custbodyship_to_company', shipCompany);
					record.setFieldValue('custbodyship_to', shipName);					
					record.setFieldValue('trandate', formattedDate);	
					if (potype)
					{
						if (verifiedEmployee == '154258' || verifiedEmployee == '1314')
						{	
					LogMsg('Insdie the loop');						
					record.setFieldValue('custbodypurchase_request_ype', getNSInternalPOType(purchasetype));
						}					
					}
					record.setFieldValue('externalid', 'Coupa-purchaseorder'
							+ tranid);
					record.setFieldValue('customform', 116);
		
					// Set Custom Field Values
					if (customFieldsLen != null && customFieldsToSetLen != null) {
						for (var y = 0; y < parseInt(customFieldsLen); y++) {
							record.setFieldValue(customFieldsToSet[y],
									customFields[y]);
						}
					}

				} // End of yy == 0
				
				var eventHeader = nlapiSelectNode(purchaseHeaderHeaderNode,
							'requisition-header');
				//var events = new Array();
					//events = nlapiSelectNodes(eventHeader, 'event');
					var approved_date = nlapiSelectValue(eventHeader, 'created-at');
					var shipToAttention = nlapiSelectValue(eventHeader, 'ship-to-attention');
				
			

				var lineID = nlapiSelectValue(expenseLinesLineNode[yy], 'id');
				var coupaExpDescription = nlapiSelectValue(
						expenseLinesLineNode[yy], 'description');
				
							
				// getting line currency
				convertedcurr = getCoupaCurrency(expenseLinesLineNode[yy]);

				LogMsg('entered for convertedcurr ' + convertedcurr);

				expenseLineAmount = nlapiSelectValue(expenseLinesLineNode[yy], 'price');
				expenseLineqty = nlapiSelectValue(expenseLinesLineNode[yy], 'quantity');
				
				
					LogMsg('entered for expenseLineAmount ' + expenseLineAmount);

					record.selectNewLineItem('item');
					//record.setCurrentLineItemValue('item', 'item', nlapiSelectValue(
					//expenseLinesLineNode[yy], 'id'));
					
					//umesh 
					record.setCurrentLineItemValue('item', 'item', getNSInternalItemId(coupaExpDescription));	
					
			
					if (expenseLineAmount) {
					record.setCurrentLineItemValue('item', 'rate',
								expenseLineAmount);
					record.setCurrentLineItemValue('item', 'quantity',
								expenseLineqty);
						
					} else {
						LogMsg('No Amount in Coupa.');
					}
					LogMsg('entered for amount ' + expenseLineAmount);

					if (convertedcurr) {
						record.setCurrentLineItemValue('item', 'currency',
								convertedcurr);
					} else {
						LogMsg('No Currency in Coupa.');
					}
					LogMsg('entered for currency ' + convertedcurr);

					if (lineID) {
						record.setCurrentLineItemValue('item',
								'custcol_coupa_po_lineid', lineID);
					} else {
						LogMsg('No Line ID in Coupa.');
					}
					LogMsg('entered for lineID ' + lineID);
					
					if (coupaExpDescription) {
						record.setCurrentLineItemValue('item',
								'itemdescription', coupaExpDescription);
					} else {
						LogMsg('No Expense Description in Coupa.');
					}
					LogMsg('entered for coupaExpDescription ' + coupaExpDescription);
				
					
					// dept
					if (context.getSetting('SCRIPT',
							'custscript_coupa_er_deptseg')) {
						if (coupaDept != null && coupaDept != "") {
							record.setCurrentLineItemValue('item',
									'department', coupaDept);
						} else {
							LogMsg('Coupa Department not found.');
						}
					}

					// class

					if (coupaClass) {
						if (coupaClass != null && coupaClass != "") {
							record.setCurrentLineItemValue('item', 'class',
									coupaClass);
						} else {
							LogMsg('Coupa class not Found.');
						}
					}

					// location

					if (context.getSetting('SCRIPT',
							'custscript_coupa_er_locseg')) {
						if (coupaLocation != null && coupaLocation != "") {
							record.setCurrentLineItemValue('item',
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

					record.commitLineItem('item');

			}// end of for loop for expense lines

		} // end of main for loop that goes through each Expense

		// }
		try {
			if (purchasetype)
			{
				record.setFieldValue('supervisorapproval', 'T');
				record.setFieldValue('approvalstatus', 'approved');
				PurchaseOrderID = nlapiSubmitRecord(record, true, true);
			}
		} catch (error) {
			var expenseExists = findPurchaseOrder(tranid);
			if (expenseExists != 'false') {
				LogMsg('NetSuite Purchase Order Created: ' + tranid
						+ ' and updating export flag');
				setExportedToTrue(tranid);
				return true;
			} else {
				errmsg = getErrorDetails(error);
				nlapiSendEmail(
				-5,
				nlapiGetContext().getSetting('SCRIPT',
						'custscript_coupa_po_email_addr_notify'),
				nlapiGetContext().getSetting('SCRIPT',
						'custscript_coupa_po_acccountname')
						+ ' Purchase Report Integration:Processing Error',
				'Error Code = ' + errorcode + ' Error Description = '
						+ errordetails);
				return false;
			}
		} // catch
		if (purchasetype)
		{
		setExportedToTrue(tranid);
		return true;
		}
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
		if (result1 != null && result1.length > 0)
			postingPeriodId = result1[0].getId();
	}

	return postingPeriodId;
}

function getCoupaDept(accountNode) {
	var deptsegment = nlapiGetContext().getSetting('SCRIPT',
			'custscript_coupa_po_deptseg');
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
			'custscript_coupa_po_classseg');
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
			'custscript_coupa_po_locseg');
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

	var Nday = datesplit[2];

	var Nmonth = datesplit[1];

	var netDate = Nmonth + '/' + Nday + '/' + Nyear;

	return netDate;
}

// finding if Purchase Order is existing will return the ID if found, will
// return false if not found
function findPurchaseOrder(tranid) {
	var filters = new Array();

	filters[0] = new nlobjSearchFilter('custbody_coupa_po_number', null, 'is',
			tranid);

	var searchresults = nlapiSearchRecord('purchaseorder', null, filters);

	if (searchresults && searchresults.length > 0) {

		return searchresults[0].getId();
	} else
		return 'false';

}

function verifyEmployee(verifiedEmployee) {
	var customField = context.getSetting('SCRIPT',
			'custscript_coupa_po_employee_num');
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

	var searchresults = nlapiSearchRecord('employee', null, filters);
	if (!searchresults) {
		return null;
	}
	return searchresults[0].getId();

}

function getCustomFields(PurchaseOrderID, purchaseHeaderHeaderNode) {
	var custbody_val = new Array();
	var arrCustBodyList = new Array();
	// var arrTempList = new Array();

	if (PurchaseOrderID != null || PurchaseOrderID != "") {
		custbody_val = PurchaseOrderID.split(";");
		var ctr = 0;
		for (var y = 0; y < custbody_val.length; y++) {
			arrCustBodyList = custbody_val[y].split("==");
			for (var x = 0; x < arrCustBodyList.length; x++) {

				// set array values only if x=0
				if (x == 0) {
					// customFields.push(arrCustBodyList[0]);
					var valueSet = nlapiSelectValue(purchaseHeaderHeaderNode,
							arrCustBodyList[0]);
					if (valueSet.indexOf("\n") > -1) {
						valueSet = nlapiSelectValue(purchaseHeaderHeaderNode,
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
			'custscript_coupa_po_deptseg');
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
			'custscript_coupa_po_classseg');
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
			'custscript_coupa_po_locseg');
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
			'custscript_coupa_po_subsseg');
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

function getNSInternalItemId(itemdescription){
	var filters = new Array();
	var columns = new Array();
	
	filters[0] = new nlobjSearchFilter('name', null, 'is', itemdescription.trim());
	nlapiLogExecution("DEBUG","itemdescription",itemdescription);
	columns[0] = new nlobjSearchColumn('internalid');
	var results = nlapiSearchRecord('item', null, filters, columns);
	itemid = results[0].getValue('internalid');
	nlapiLogExecution("DEBUG","internalid",itemid);
	return itemid;
}

function getNSInternalSubId(subName){
	var filters = new Array();
	var columns = new Array();
	
	filters[0] = new nlobjSearchFilter('name', null, 'is', subName);
	nlapiLogExecution("DEBUG","subName1",subName);
	columns[0] = new nlobjSearchColumn('internalid');
	var results = nlapiSearchRecord('subsidiary', null, filters, columns);
	itemid = results[0].getValue('internalid');
	nlapiLogExecution("DEBUG","internalid",itemid);
	return itemid;
}

function getNSInternalPOType(purchasetype){
	var filters = new Array();
	var columns = new Array();
	
	filters[0] = new nlobjSearchFilter('name', null, 'is', purchasetype);
	nlapiLogExecution("DEBUG","purchasetype",purchasetype);
	columns[0] = new nlobjSearchColumn('internalid');
	var results = nlapiSearchRecord('customlistpurchase_request_type_list', null, filters, columns);
	itemid = results[0].getValue('internalid');
	nlapiLogExecution("DEBUG","internalid",itemid);
	return itemid;
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
						'custscript_coupa_po_email_addr_notify'),
				nlapiGetContext().getSetting('SCRIPT',
						'custscript_coupa_po_acccountname')
						+ ' Invoice Integration:Processing Error - Unable to do Coupa request api call to export Invoices',
				'Error Code = ' + errorcode + ' Error Description = '
						+ errordetails);
		return errordetails;
	}

}
var fx = 'Purchase Order ';
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
