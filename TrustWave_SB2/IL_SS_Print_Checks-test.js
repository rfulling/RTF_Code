/**
 * @author udig
 */

function printChecksForm(request, response) {
	if(request.getMethod() == 'GET')  {  // Stage 1 
	
		//Creating the form    
		var form = nlapiCreateForm("Israeli Print Checks Wizard (Select Account and Check Type)");    
		var debugState = false;
		
		//set the stage of the Check printing wizard (initial stage)
		var resultField0 = form.addField('custpage_stage', 'text', 'Wizard Stage: ');    
		resultField0.setDefaultValue('1');    
		resultField0.setDisplayType('hidden');

		// add the select field for the 'account'
	    var filters = new Array();
		filters[0] = new nlobjSearchFilter('type', null, 'is', 'Bank');
		filters[1] = new nlobjSearchFilter('custrecord_il_currencysymbol', null, 'is', 'ILS');
		//if (isSubsidiarySettingOn()) {
		//	filters[1] = new nlobjSearchFilter('subsidiary', null, 'is', nlapiGetContext().getSubsidiary());
		//}
		
		var columns = new Array();
		columns[0] = new nlobjSearchColumn('name');
		columns[0].setSort();
	    
		var accountResults = nlapiSearchRecord('account', null, filters, columns);  
		if (accountResults != null && accountResults.length > 0) {
			// create select options for account from records
		    var accountField = form.addField('printchecks_account_field','select','Select Account');
			for (i = 0; i < accountResults.length; i++) {
				accountField.addSelectOption(accountResults[i].getId(), accountResults[i].getValue('name'));
			}
	
			// create select options for transaction types
		    var accountField = form.addField('printchecks_trantype_field','select','Select Check Type');
			accountField.addSelectOption('0','All Check Types');
			accountField.addSelectOption('Check','Check');
			accountField.addSelectOption('VendPymt','Vendor Payment');
			accountField.addSelectOption('CustRfnd','Customer Refund');
			accountField.addSelectOption('CashRfnd','Cash Refund');
	
			form.addSubmitButton('Submit and go to Select Check Numbers >>');		    
		} else {
			var msg = 'There are no Checks or relevant accounts in this system.';
			var resultField4 = form.addField('printchecks_error_message', 'textarea', '');
			resultField4.setDefaultValue(msg);
			resultField4.setDisplayType('inline');
		}
		
		response.writePage(form);	
		
	} else {    //POST call
		if (request.getParameter('custpage_stage') == '1') { // Stage 2
			
			var form = nlapiCreateForm("Israeli Print Checks Wizard (Select Checks to be Printed)");
			var debugState = false;
			
			//set the stage of the Check printing wizard (second stage)
			var resultField0 = form.addField('custpage_stage', 'text', 'Wizard Stage: ');
			resultField0.setDefaultValue('2');
			resultField0.setDisplayType('hidden');
			
			// get filters from POST
			var typeFilter = request.getParameter('printchecks_trantype_field');
			var accountFilter = request.getParameter('printchecks_account_field');
			// recreate account filter from POST
			var resultField1 = form.addField('printchecks_account_field', 'text', 'Account to be Used: ');
			resultField1.setDefaultValue(accountFilter);
			resultField1.setDisplayType('hidden');
			var resultField1txt = form.addField('printchecks_account_text_field', 'text', 'Account to be Used: ');
			resultField1txt.setDefaultValue(nlapiLookupField('account',accountFilter,'name'));
			resultField1txt.setDisplayType('inline');
			
			// recreate check type filter from POST
			var resultField2 = form.addField('printchecks_trantype_field', 'text', 'Check Type to be Used: ');
			var typeFilterArray = new Array();
			if (typeFilter == '' || typeFilter == '0') {
				typeFilterArray = ['Check', 'VendPymt','CustRfnd', 'CashRfnd']; //, 'LiabPymt', 'TaxLiab'];
				resultField2.setDefaultValue('All Check Types');
			}
			else {
				typeFilterArray = [typeFilter]
				resultField2.setDefaultValue(typeFilter);
			}
			resultField2.setDisplayType('inline');
			
			// add 2 select fields for the 'from' and 'to' range of Checks
			var filters = new Array();
			filters[0] = new nlobjSearchFilter('mainline', null, 'is', 'T');
			filters[1] = new nlobjSearchFilter('type', null, 'anyof', typeFilterArray);
			filters[2] = new nlobjSearchFilter('account', null, 'is', accountFilter);
			filters[3] = new nlobjSearchFilter('custbody_il_transaction_state', null, 'noneof', '@NONE@');
			filters[4] = new nlobjSearchFilter('custrecord_il_tancheck_printed', 'custbody_il_transaction_state', 'is', 'F');
			filters[5] = new nlobjSearchFilter('formulanumeric', null, 'greaterthan', 0);
			filters[5].setFormula('to_number({tranid})');
			
			// Set Columns
			var columns = new Array();
			columns[0] = new nlobjSearchColumn('tranid');
			columns[0].setSort();
			
			var tranIDresults = getRecords('transaction', filters, columns);
			
			// create select options from records
			var tempID;
			if (tranIDresults != null && tranIDresults.length > 0) {
				var fromNo = form.addField('printchecks_from_field', 'select', 'From Check No.');
				var toNo = form.addField('printchecks_to_field', 'select', 'To Check No.');
				fromNo.setBreakType('startcol');
				toNo.addSelectOption('', 'Print Single Check (From field)');
				for (var itc = 0; itc < tranIDresults.length; itc++) {
					tempID = tranIDresults[itc].getValue('tranid').trim();
					fromNo.addSelectOption(tempID, tempID);
					toNo.addSelectOption(tempID, tempID);
				}
				var printLimitInfoFld = form.addField('custpage_limitinfo', 'inlinehtml', '');
				printLimitInfoFld.setDefaultValue('<ul><li>Note: Currently you can print maximum 6 checks.</li></ul>');
				//form.addButton('custpage_back_button', '<< Go back to the previous page', 'history.go(-1)');
				form.addSubmitButton('Submit and go to Prepare for Printing >>');
			} else {
				var msg = 'There are no Checks in this category.';
				msg += '<br />Please press the button to go back to the previous page...';
				var resultField4 = form.addField('printchecks_error_message', 'textarea', '');
				resultField4.setDefaultValue(msg);
				resultField4.setDisplayType('inline');
				form.addButton('custpage_back_button', '<< Go back to the previous page', 'history.go(-1)');
			}
			
			response.writePage(form);
			
		} else if (request.getParameter('custpage_stage') == '2') { // Stage 3
			
			var form = nlapiCreateForm("Israeli Print Checks Wizard (Confirm Printing Information)");
			var debugState = false;
			
			//set the stage of the Check printing wizard (second stage)
			var resultField0 = form.addField('custpage_stage', 'text', 'Wizard Stage: ');
			resultField0.setDefaultValue('3');
			resultField0.setDisplayType('hidden');
			
			// get filters from POST
			var typeFilter = request.getParameter('printchecks_trantype_field');
			var accountFilter = request.getParameter('printchecks_account_field');
			// recreate filters from POST
			var resultField1 = form.addField('printchecks_account_field', 'text', 'Account to be Used: ');
			resultField1.setDefaultValue(accountFilter);
			resultField1.setDisplayType('hidden');
			var resultField1txt = form.addField('printchecks_account_text_field', 'text', 'Account to be Used: ');
			resultField1txt.setDefaultValue(nlapiLookupField('account',accountFilter,'name'));
			resultField1txt.setDisplayType('inline');

			var resultField2 = form.addField('printchecks_trantype_field', 'text', 'Check Type to be Used: ');
			var typeFilterArray = new Array();
			var typeFilterText = '';
			if (typeFilter == '' || typeFilter == '0' || typeFilter == 'All Check Types') {
				typeFilterArray = ['Check', 'VendPymt', 'CustRfnd', 'CashRfnd']; //, 'LiabPymt', 'TaxLiab'];
				typeFilterText = 'All Check Types';
			}
			else {
				typeFilterArray = [typeFilter];
				typeFilterText = typeFilter;
			}
			resultField2.setDefaultValue(typeFilterText);
			resultField2.setDisplayType('inline');

			// Check that to and from Check numbers are valid
			var fromNo = request.getParameter('printchecks_from_field');
			var toNo = request.getParameter('printchecks_to_field');
			
			if (toNo == '') { // check if single Check
				toNo = fromNo;
			} else if ((fromNo*1) > (toNo*1)) { //check if from and to were not switched
				var tempNo = fromNo;
				fromNo = toNo;
				toNo = tempNo;
			}

			// set to and from fields
			var resultField5 = form.addField('printchecks_from_field', 'text', 'From Check: ');
			resultField5.setDefaultValue(fromNo);
			resultField5.setDisplayType('hidden');
			var resultField6 = form.addField('printchecks_to_field', 'text', 'To Check: ');
			resultField6.setDefaultValue(toNo);
			resultField6.setDisplayType('hidden');
			
			// add 2 select fields for the 'from' and 'to' range of Checks
			var filters = new Array();
			filters[0] = new nlobjSearchFilter('mainline', null, 'is', 'T');
			filters[1] = new nlobjSearchFilter('type', null, 'anyof', typeFilterArray);
			filters[2] = new nlobjSearchFilter('account', null, 'is', accountFilter);
			filters[3] = new nlobjSearchFilter('custbody_il_transaction_state', null, 'noneof', '@NONE@');
			filters[4] = new nlobjSearchFilter('custrecord_il_tancheck_printed','custbody_il_transaction_state', 'isnot', 'T');
			filters[5] = new nlobjSearchFilter('formulanumeric', null, 'greaterthan', 0);
			filters[5].setFormula('to_number({tranid})');
			filters[6] = new nlobjSearchFilter('formulanumeric', null, 'between', fromNo, toNo);
			filters[6].setFormula('to_number({tranid})');
			
			// Set Columns
			var columns = new Array();
			columns[0] = new nlobjSearchColumn('tranid');
			columns[0].setSort();
			
			var tranIDresults = getRecords('transaction', filters, columns, 6);
			
			//create array filter and sort
			var tempID;
			var tranIDresultsArray = new Array();
			var internalIDresultsArray = new Array();
			if (tranIDresults != null && tranIDresults.length > 0) {
				var itb = 0;
				for (var ita = 0; ita < tranIDresults.length; ita++) {
					tempID = tranIDresults[ita].getValue('tranid').trim();
					tranIDresultsArray[itb] = tempID;
					internalIDresultsArray[itb] = tranIDresults[ita].getId();
					itb++;
				}
			}
			
			// create textarea of Check numbers from records
			var tranIDstr = '';
			var internalIDstr = '';
			if (tranIDresultsArray != null && tranIDresultsArray.length > 0) {
				tranIDstr = tranIDresultsArray.join('<br>');
				internalIDstr = internalIDresultsArray.join(',');
			}
			
			var resultField4 = form.addField('printchecks_nums_field', 'longtext', 'List of Checks to Print: ');
			resultField4.setDefaultValue(tranIDstr);
			resultField4.setDisplayType('inline');
			var resultField5 = form.addField('printchecks_id_field', 'longtext', 'List of Checks ID to Print: ');
			resultField5.setDefaultValue(internalIDstr);
			resultField5.setDisplayType('hidden');
			
			var pdfParams = {
				'printchecks_id_field' : internalIDstr
			}
			var printUrl = nlapiResolveURL('SUITELET','customscript_il_print_checks_pdf_gen', 'customdeploy_il_print_checks_pdf_gen');
			printUrl += ('&' + serializeParameters(pdfParams));
			form.addButton("custpage_printbutton", "Print Checks", "document.location ='" + printUrl + "';");
			response.writePage(form);

		}
	}
}

function generateCheckPdf(request,response) {
	//general parameters
	
	var debugState = false;
	var closeChecks = true;
	var context = nlapiGetContext();
	//var tableRows = context.getSetting('SCRIPT', 'custscript_table_rows');
	var maxTableRows = 6;
	var checkTypes = {'VendPymt':'vendorpayment', 'CustRfnd':'customerrefund', 'CashRfnd':'cashrefund', 'Check':'check'};
	
	//define variables for style and content for PDF XML
	var detailTableLabel = 'חשבונית';  //different types of checks may require duifferent table header for that column
	var newLine = '<br />';
	var tabChar = '&nbsp;&nbsp;&nbsp;&nbsp;';
	var str = '<body size="A4-landscape" background-macro="content0" >\n';
	var macroStr = '';
	var bookmarks = '';
	var checkCount = 0;
	
	//***********  DEFINE STYLE FOR ONE-WORLD  *************
	//
	var styleStr = createStyleString_OW();
	//var styleStr = createStyleString_NO_OW();
	//
	//******************************************************
	
	//get PDF resources
	var baseURL = request.getURL().substring(8);
	baseURL = baseURL.substring(0,baseURL.indexOf('/'));
	var checkResources = new Array();
	checkResources['font'] = getFileURL('arial.ttf').replace(/\&/gi,'&amp;');
	checkResources['date'] = getFileURL('IL_check_date.png').replace(/\&/gi,'&amp;');
	checkResources['new_shekel'] = getFileURL('IL_check_new_shekel.png').replace(/\&/gi,'&amp;');
	checkResources['payto'] = getFileURL('IL_check_payto.png').replace(/\&/gi,'&amp;');
	checkResources['payto_heb'] = getFileURL('IL_check_payto_heb.png').replace(/\&/gi,'&amp;');
	checkResources['shekel'] = getFileURL('IL_check_shekel.png').replace(/\&/gi,'&amp;');
	checkResources['to'] = getFileURL('IL_check_to.png').replace(/\&/gi,'&amp;');
	checkResources['void'] = getFileURL('IL_check_void.png').replace(/\&/gi,'&amp;');

	//set columns and filters for void check search ('void' only appears in search result fields and not in the nlapiLookupField API function)
	var voidColumns = new Array();
	voidColumns[0] = new nlobjSearchColumn('tranid');
	var voidFilters = new Array();
	voidFilters[0] = new nlobjSearchFilter('mainline', null, 'is', 'T');
	voidFilters[1] = new nlobjSearchFilter('voided', null, 'is', 'F');
	
	//get check ID's from the request object
	var checkIDsField = request.getParameter('printchecks_id_field');
	var checkIDsArray = checkIDsField.split(',');
	
	
	//iterate through checks (START)
	for (var j = 0; j < checkIDsArray.length; j++) {
		//define check variables
		var checkID = checkIDsArray[j];
		var checkAddressee = '';
		var checkFullAddress = ''
		var checkTotal = 0;
		var checkTotalString = '';
		var checkTotalText = '';
		var checkTransactionID = '';
		var checkDate = '';
		var checkStatus;
		var emptyTableRow = {'date':'&nbsp;', 'invoice':'&nbsp;', 'detail':'&nbsp;', 'amount':'&nbsp;'};
		var checkDetail = new Array();
		//for (var i = 0; i < maxTableRows; i++) checkDetail[i] = emptyTableRow;
		var checkDetailAmount = 0;
		var checkDetailTax = 0;
		var checkDetailTotal = 0;
		var checkDetailAmountString = '';
		var checkDetailTaxString = '';
		var checkDetailTotalString = '';
		var checkIsVoided = false;
		var detailLineCount = 0;
		
		//load the check record
		var checkType = checkTypes[ nlapiLookupField('transaction', checkID, 'type') ]; //convert returned type to table name
		var checkRecord = nlapiLoadRecord(checkType, checkID);
		
		//get check general values
		checkTransactionID = checkRecord.getFieldValue('tranid');
		checkDate = checkRecord.getFieldValue('trandate');
		checkTotal = Math.abs(checkRecord.getFieldValue('total'));
		//if (isSubsidiarySettingOn()) tempTotal = Math.abs(record.getFieldValue('fxamount'));		
		checkTotalString = formatCurrency(checkTotal);
		checkTotalText = ITComConvertNumToTextHeb(checkTotal);
		//checkAddressee = parseEntity(checkRecord.getFieldText('entity'));
		checkAddressee = parseEntity(checkRecord);
		checkFullAddress = (checkRecord.getFieldValue('address') || '').replace(/\r\n|\n\r|\n|\r/gi,'<br />'); //.replace(/israel/gi,'');
		if (checkFullAddress == '') checkFullAddress = checkAddressee;
		checkStatus = checkRecord.getFieldValue('custbody_il_transaction_state');
		
		//check if check is voided ('void' only appears in search result fields and not in the nlapiLookupField API function)
		voidFilters[2] = new nlobjSearchFilter('internalid', null, 'is', checkID);
		var voidSearchresults = nlapiSearchRecord('transaction', null, voidFilters, voidColumns);
		if (voidSearchresults != null && voidSearchresults.length > 0) {  //if check is not voided
			//get rest of the values according to check type
			switch(checkType) {
				case 'check':
					var checkLineObj = {};
					checkLineObj.date = checkRecord.getFieldValue('trandate');
					checkLineObj.invoice = '&nbsp;';
					checkLineObj.detail = checkRecord.getFieldValue('memo');
					if(checkLineObj.detail == null) {
						checkLineObj.detail = '';
					}
					checkLineObj.amount = checkTotalString;
					checkDetail.push(checkLineObj);
					checkDetailAmountString = checkTotalString;
					checkDetailTaxString = '0.00';
					checkDetailTotalString = checkTotalString;
					detailLineCount++;
					break;
				
				case 'vendorpayment':
					var lineItemCount = checkRecord.getLineItemCount('apply');
					for (var i = 1; i <= lineItemCount; i++) {
						if (checkRecord.getLineItemValue('apply', 'apply', i) == 'T') {
							checkDetailAmount += checkRecord.getLineItemValue('apply', 'total', i) * 1;
							checkDetailTax += checkRecord.getLineItemValue('apply', 'disc', i) * 1;
							checkDetailTotal += checkRecord.getLineItemValue('apply', 'amount', i) * 1;
							var checkLineObj = {};
							checkLineObj.date = checkRecord.getLineItemValue('apply', 'applydate', i);
							checkLineObj.invoice = checkRecord.getLineItemValue('apply', 'refnum', i);
							checkLineObj.detail = nlapiLookupField('vendorbill', checkRecord.getLineItemValue('apply', 'doc', i), 'memo');
							checkLineObj.amount = formatCurrency(checkRecord.getLineItemValue('apply', 'total', i));
							checkDetail.push(checkLineObj);
							detailLineCount++;
						}
					}

					checkDetailAmountString = formatCurrency(checkDetailAmount);
					checkDetailTaxString = formatCurrency(checkDetailTax);
					checkDetailTotalString = formatCurrency(checkDetailTotal);
					
					/*if (detailLineCount > maxTableRows) {  //there are more invoices than lines in the table
						//reset details table
						for (var i = 0; i < maxTableRows; i++) 
							checkDetail[i].date = checkDetail[i].invoice = checkDetail[i].detail = checkDetail[i].amount = '&nbsp;';
						
						checkDetail[0].detail = 'קיים מספר רב של חשבוניות לשק זה,<br />אנא ראה פירוט חשבוניות במסמך נלווה.';
						
						
					}*/
					
					break;
				
				case 'CustRfnd':
					
					break;
				
				case 'CashRfnd':
					
					break;
				
				default:  //do not print check
					
			}
		} else { //if check is voided
			checkIsVoided = true;
			checkTotalString = checkTotalText = 'מבוטל';
		}
			
			
		
		//create PDF portion for this check
		try {
			//generate a new page for all checks after the first one
			if (checkCount > 0) {
				str += '<pbr />\n' +
					   '<pbr id="chk'+checkCount+'" size="A4-landscape" background-macro="content'+checkCount+'" />\n';
			}
			
			//set the bookmark for this section
			bookmarks += ' <bookmark name="Check No. ' + checkTransactionID + '" href="#chk' + checkCount + '" />\n';
			
			//print Check information
			macroStr += '<macro id="content' + checkCount + '">\n';
			
			//create background image layer
			macroStr += '<div id="chk' + checkCount + '" class="backgroundDiv"';
			if (checkIsVoided) macroStr += ' background-image="'+checkResources['void']+'"';
			macroStr += ' position="relative" >\n';
			
			//create image layers (titles and underlines)
			macroStr += ' <div class="addressLabelDiv1 image" background-image="'+checkResources['to']+'"><span /></div>\n' +
						' <div class="dateDiv dateDiv1 image" background-image="'+checkResources['date']+'"><span /></div>\n' +
						' <div class="paytoDiv1 bottomLine image" background-image="'+checkResources['payto']+'"><span /></div>\n' +
						' <div class="paytoLabelDiv1 bottomLine image" background-image="'+checkResources['payto_heb']+'"><span />&nbsp;</div>\n' +
						' <div class="shekelDiv1 bottomLine image" background-image="'+checkResources['shekel']+'"><span /></div>\n' +
						' <div class="totalTextDiv1 bottomLine image" background-image="'+checkResources['new_shekel']+'"><span /></div>\n' +
						' <div class="dateDiv checkDateDiv1 image" background-image="'+checkResources['date']+'"><span /></div>\n' +
						' <div class="addressLabelDiv2 image" background-image="'+checkResources['to']+'"><span /></div>\n' +
						' <div class="dateDiv dateDiv2 image" background-image="'+checkResources['date']+'"><span /></div>\n' +
						' <div class="paytoDiv2 bottomLine image" background-image="'+checkResources['payto']+'"><span /></div>\n' +
						' <div class="paytoLabelDiv2 bottomLine image" background-image="'+checkResources['payto_heb']+'"><span /></div>\n' +
						' <div class="shekelDiv2 bottomLine image" background-image="'+checkResources['shekel']+'"><span />&nbsp;</div>\n' +
						' <div class="totalTextDiv2 bottomLine image" background-image="'+checkResources['new_shekel']+'"><span /></div>\n' +
						' <div class="dateDiv checkDateDiv2 image" background-image="'+checkResources['date']+'"><span /></div>\n';
			
			//information layers
			macroStr += ' <div class="idDiv"><span />Check No. ' + checkTransactionID + ' (' + (checkCount + 1) + '/' + checkIDsArray.length + ')</div>\n' +
						' <div class="addressDiv1"><span />' + checkFullAddress + '</div>\n' +
						' <div class="dateDiv1 dateDiv alignCenter data"><span />' + checkDate + '</div>\n' +
						' <div class="paytoDiv1 data"><span />' + checkAddressee + '</div>\n' +
						' <div class="totalDiv1 bottomLine alignCenter"><span />***' + checkTotalString + '***</div>\n' +
						' <div class="totalTextDiv1 data"><span />' + checkTotalText + '</div>\n' +
						' <div class="checkDateDiv1 dateDiv alignCenter data"><span />' + checkDate + '</div>\n' +
						' <div class="addressDiv2"><span />' + checkFullAddress + '</div>\n' +
						' <div class="dateDiv2 dateDiv alignCenter data"><span />' + checkDate + '</div>\n' +
						' <div class="paytoDiv2 data"><span />' + checkAddressee + '</div>\n' +
						' <div class="totalDiv2 alignCenter bottomLine"><span />***' + checkTotalString + '***</div>\n' +
						' <div class="totalTextDiv2 data"><span />' + checkTotalText + '</div>\n' +
						' <div class="checkDateDiv2 dateDiv alignCenter data"><span />' + checkDate + '</div>\n';
			
			//print details table information
				//create table headers
				var tableStr = '';
				tableStr += '<table width="100%" border="0">\n' +
							'  <tr>\n' +
							'    <td class="borderDouble" width="16%">סכום</td>\n' +
							'    <td class="borderDouble" width="52%">פרטים</td>\n' +
							'    <td class="borderDouble" width="16%">' + detailTableLabel + '</td>\n' +
							'    <td class="borderDouble" width="16%">תאריך</td>\n' +
							'  </tr>\n';
	
				//create the table contents
				if (detailLineCount > maxTableRows) {
					tableStr += 
					'<tr>' +
						'<td></td>' +						
						'<td>קיים מספר רב של חשבוניות לשק זה,<br />אנא ראה פירוט חשבוניות במסמך נלווה.</td>' +
						'<td></td>' +
						'<td></td>' + 
					'</tr>';
				}
				else {
					for (var i = 0; i < checkDetail.length; i++) {
						tableStr += 
							'<tr>' +
								'<td>' + checkDetail[i].amount + '</td>' +
								'<td>' + nlapiEscapeXML(checkDetail[i].detail) + '</td>' +
								'<td>' + nlapiEscapeXML(checkDetail[i].invoice) + '</td>' +
								'<td>' + checkDetail[i].date + '</td>' + 
							'</tr>';
					}
				}
	
				//add totals to table
				tableStr += '  <tr>\n' +
							'    <td>' + checkDetailAmountString + '</td>\n' +
							'    <td class="borderCorner"> סה"כ</td>\n' +
							'    <td class="borderTop">&nbsp;</td>\n' +
							'    <td class="borderTop">&nbsp;</td>\n' +
							'  </tr>\n' +
							'  <tr>\n' +
							'    <td>' + checkDetailTaxString + '</td>\n' +
							'    <td class="borderSide"> ניכוי מס במקור</td>\n' +
							'    <td class="borderClean">&nbsp;</td>\n' +
							'    <td class="borderClean">&nbsp;</td>\n' +
							'  </tr>\n' +
							'  <tr>\n' +
							'    <td>' + checkDetailTotalString + '</td>\n' +
							'    <td class="borderSide"> סה"כ לתשלום</td>\n' +
							'    <td class="borderClean">&nbsp;</td>\n' +
							'    <td class="borderClean">&nbsp;</td>\n' +
							'  </tr>\n' +
							'</table>\n';
			
			//add the created table to this page's macro
			macroStr += ' <div class="tableDiv1" style="padding-top:40px;">' + tableStr + '</div>\n' +
						' <div class="tableDiv2" style="padding-top:40px;">' + tableStr + '</div>\n' +
						'</div>\n' +
						'</macro>\n';
		} catch(e) {
			macroStr += '</div>\n' +
						'</macro>\n';
		}
			
		//close the check to block future prints
		if (closeChecks) {
	        nlapiSubmitField('customrecord_il_transaction_state', checkStatus, 'custrecord_il_tancheck_printed', 'T');
		}
		
		checkCount++;

	} //iterate through checks (END)

	if (checkCount == 1) str += '<pbr />\n';  //close the page, if there's only one check being printed
	
	//prepare xml for PDF conversion
	var xml = '<?xml version="1.0"?>\n<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">\n<pdf>\n' +
			  '<head>\n' +
			  '<meta name="base" value="https://'+baseURL+'" />\n' +
			  '<meta name="title" value="Print Checks (NetSuite)" />\n' +
			  '<meta name="author" value="NetSuite Israel" />\n' +
			  '<meta name="show-bookmarks" value="true" />\n' +
			  '<meta name="access-level" value="print-all change-none extract-none" />\n' +
			  //'<meta name="password" value="itcom123" />\n' +
			  '<link name="Arial" type="font" subtype="truetype" bytes="2" src="' + checkResources['font'] + '" />\n' +
			  '<style>\n' + styleStr + '</style>\n' +
			  '<macrolist>\n' + macroStr + '</macrolist>\n' +
			  '<bookmarklist>\n' + bookmarks + '</bookmarklist>\n' +
			  '</head>\n' +
			  str + '</body>\n' +
			  '</pdf>\n';
	
	if (!debugState) { 
		var file = nlapiXMLToPDF( xml );
		response.setContentType('PDF','print-checks.pdf');
		response.write( file.getValue() );
		
	} else {
		response.write( xml );
	}

}

function createStyleString_OW() {
	// create style sheet for XML output
	var styleStr = 'body, p, div { font:9pt/9pt Arial; vertical-align:bottom; align:right; color:#000; margin:0; padding:0 1mm 0 1mm; direction:rtl; }\n' +
				   'div { background-image-dpi:110; align:right; overflow: hidden; z-index:20; direction:rtl; }\n' +
				   '.bottomLine { border-bottom:1px solid black; }\n' +
				   '.dateDiv { border-bottom:1px solid black; position:absolute; width:51.04mm; height:4.64mm; }\n' +
				   '.alignCenter p { align:center; }\n' +
				   '.backgroundDiv { position:relative; overflow:hidden; margin:0; padding:0; width:297mm; height:210mm; background-repeat:no-repeat; size:A4-landscape; }\n' +
				   '.addressDiv1 { padding:1mm; position:absolute; width:57.31mm; height:21.81mm; left: 220.19mm; top: 29.93mm; border-top:1px solid black; }\n' +
				   '.addressDiv2 { padding:1mm; position:absolute; width:57.31mm; height:21.81mm; left: 93.74mm; top: 27.37mm; border:1px solid black; }\n' +
				   '.addressDiv1 p, .addressDiv2 p { font:9pt/11pt Arial; vertical-align:top; }\n' +
				   '.addressLabelDiv1 { position:absolute; width:57.31mm; height:4.64mm; left: 220.19mm; top: 25.29mm; }\n' +
				   '.addressLabelDiv2 { position:absolute; width:57.31mm; height:4.64mm; left: 93.74mm; top: 22.73mm; }\n' +
				   '.tableDiv1 { position:absolute; width:126.45mm; height:67.28mm; left: 166.13mm; top: 61.48mm; }\n' +
				   '.tableDiv2 { position:absolute; width:150.82mm; height:67.28mm; left: 6.26mm; top: 61.48mm; }\n' +
				   '.totalTextDiv1 { position:absolute; width:92.11mm; height:4.64mm; left: 168.22mm; top: 183.30mm; }\n' +
				   '.shekelDiv1 { position:absolute; width:4.64mm; height:4.64mm; left: 260.33mm; top: 183.30mm; border-left:1px solid black; }\n' +
				   '.totalDiv1 { position:absolute; width:26.68mm; height:4.64mm; left: 264.97mm; top: 183.30mm; border-right:1px solid black; }\n' +
				   '.totalDiv1 p { font:8pt/9pt Arial; }\n' +
				   '.totalTextDiv2 { position:absolute; width:106.73mm; height:4.64mm; left: 5.8mm; top: 183.30mm; }\n' +
				   '.shekelDiv2 { position:absolute; width:4.64mm; height:4.64mm; left: 112.53mm; top: 183.30mm; border-left:1px solid black; }\n' +
				   '.totalDiv2 { position:absolute; width:38.28mm; height:4.64mm; left: 117.17mm; top: 183.30mm; border-right:1px solid black; }\n' +
				   '.paytoDiv1 { position:absolute; width:115.31mm; height:4.64mm; left: 168.22mm; top: 174.25mm; }\n' +
				   '.paytoLabelDiv1 { position:absolute; width:8.12mm; height:4.64mm; left: 283.54mm; top: 174.25mm; background-position:repeat; }\n' +
				   '.paytoDiv2 { position:absolute; width:141.53mm; height:4.64mm; left: 5.8mm; top: 174.25mm; }\n' +
				   '.paytoLabelDiv2 { position:absolute; width:8.12mm; height:4.64mm; left: 147.33mm; top: 174.25mm; background-position:right bottom; }\n' +
				   '.checkDateDiv1 { position:absolute; left: 240.61mm; top: 191.65mm; }\n' +
				   '.checkDateDiv2 { position:absolute; left: 81.21mm; top: 191.19mm; }\n' +
				   '.dateDiv1 { position:absolute; left: 164.51mm; top: 46.87mm; }\n' +
				   '.dateDiv2 { position:absolute; left: 14.15mm; top: 44.78mm; }\n' +
				   '.idDiv { align:left; position:absolute; left: 164.51mm; top: 2mm; width:51.04mm; height:4.64mm; }\n' +
				   '.idDiv p { font:6pt/6pt Arial; align:left; color:#808080; }\n' +
				   'table, td { table-layout:fixed; border:1px solid black; }\n' +
				   'td p { font:8pt/10pt Arial; border:0; direction:rtl; align:right; text-align:right; }\n' +
				   'td.borderClean { border:0; }\n' +
				   'td.borderCorner { border-bottom:0; border-right:0; }\n' +
				   'td.borderCorner p { align:left; text-align:left; }\n' +
				   'td.borderSide { border-bottom:0; border-right:0; border-top:0; }\n' +
				   'td.borderSide p { align:left; text-align:left; }\n' +
				   'td.borderTop { border-bottom:0; border-right:0; border-left:0; }\n' +
				   'td.borderDouble { border-bottom:2px double black; }\n' +
				   'td.borderDouble p { align:center; text-align:center; }\n' +
				   '.data { z-index:200; }\n' +
				   '.image { background-position:repeat; }\n';

	return styleStr;
}

function createStyleString_NO_OW() {
	// create style sheet for XML output
	var styleStr = 'body, p, div { font:9pt/9pt Arial; vertical-align:bottom; align:right; color:#000; margin:0; padding:0 1mm 0 1mm; direction:rtl; }\n' +
				   'div { background-image-dpi:110; align:right; overflow: hidden; z-index:20; direction:rtl; }\n' +
				   '.bottomLine { border-bottom:1px solid black; }\n' +
				   '.dateDiv { border-bottom:1px solid black; position:absolute; width:51.04mm; height:4.64mm; }\n' +
				   '.alignCenter p { align:center; }\n' +
				   '.backgroundDiv { position:relative; overflow:hidden; margin:0; padding:0; width:297mm; height:210mm; background-repeat:no-repeat; size:A4-landscape; }\n' +
				   '.addressDiv1 { padding:1mm; position:absolute; width:57.31mm; height:21.81mm; left: 220.19mm; top: 29.93mm; border-top:1px solid black; }\n' +
				   '.addressDiv2 { padding:1mm; position:absolute; width:57.31mm; height:21.81mm; left: 93.74mm; top: 27.37mm; border:1px solid black; }\n' +
				   '.addressDiv1 p, .addressDiv2 p { font:9pt/11pt Arial; vertical-align:top; }\n' +
				   '.addressLabelDiv1 { position:absolute; width:57.31mm; height:4.64mm; left: 220.19mm; top: 25.29mm; }\n' +
				   '.addressLabelDiv2 { position:absolute; width:57.31mm; height:4.64mm; left: 93.74mm; top: 22.73mm; }\n' +
				   '.tableDiv1 { position:absolute; width:126.45mm; height:67.28mm; left: 166.13mm; top: 61.48mm; }\n' +
				   '.tableDiv2 { position:absolute; width:150.82mm; height:67.28mm; left: 6.26mm; top: 61.48mm; }\n' +
				   '.totalTextDiv1 { position:absolute; width:92.11mm; height:4.64mm; left: 164.00mm; top: 183.30mm; }\n' +
				   '.shekelDiv1 { position:absolute; width:4.64mm; height:4.64mm; left: 256.00mm; top: 183.30mm; border-left:1px solid black; }\n' +
				   '.totalDiv1 { position:absolute; width:26.68mm; height:4.64mm; left: 260.57mm; top: 183.30mm; border-right:1px solid black; }\n' + //koby edit left from: 264.97mm
				   '.totalTextDiv2 { position:absolute; width:106.73mm; height:4.64mm; left: 5.8mm; top: 183.30mm; }\n' +
				   '.shekelDiv2 { position:absolute; width:4.64mm; height:4.64mm; left: 112.53mm; top: 183.30mm; border-left:1px solid black; }\n' +
				   '.totalDiv2 { position:absolute; width:38.28mm; height:4.64mm; left: 112.53mm; top: 183.30mm; border-right:1px solid black; }\n' + // koby edit left from: 117.17mm
				   '.paytoDiv1 { position:absolute; width:115.31mm; height:4.64mm; left: 163.80mm; top: 174.25mm; }\n' +	
				   '.paytoLabelDiv1 { position:absolute; width:8.12mm; height:4.64mm; left: 278.10mm; top: 174.25mm; background-position:repeat; }\n' + // koby edit left from: 283.54mm
				   '.paytoDiv2 { position:absolute; width:137.53mm; height:4.64mm; left: 5.8mm; top: 174.25mm; }\n' +
				   '.paytoLabelDiv2 { position:absolute; width:8.12mm; height:4.64mm; left: 142.70mm; top: 174.25mm; background-position:right bottom; }\n' +  // koby edit from left 147.33mm;
				   '.checkDateDiv1 { position:absolute; left: 236.00mm; top: 191.65mm; }\n' +
				   '.checkDateDiv2 { position:absolute; left: 81.21mm; top: 191.19mm; }\n' +
				   '.dateDiv1 { position:absolute; left: 165.51mm; top: 46.87mm; }\n' +
				   '.dateDiv2 { position:absolute; left: 14.15mm; top: 44.78mm; }\n' +
				   '.idDiv { align:left; position:absolute; left: 164.51mm; top: 2mm; width:51.04mm; height:4.64mm; }\n' +
				   '.idDiv p { font:6pt/6pt Arial; align:left; color:#808080; }\n' +
				   'table, td { table-layout:fixed; border:1px solid black; }\n' +
				   'td p { font:8pt/10pt Arial; border:0; direction:rtl; align:right; text-align:right; }\n' +
				   'td.borderClean { border:0; }\n' +
				   'td.borderCorner { border-bottom:0; border-right:0; }\n' +
				   'td.borderCorner p { align:left; text-align:left; }\n' +
				   'td.borderSide { border-bottom:0; border-right:0; border-top:0; }\n' +
				   'td.borderSide p { align:left; text-align:left; }\n' +
				   'td.borderTop { border-bottom:0; border-right:0; border-left:0; }\n' +
				   'td.borderDouble { border-bottom:2px double black; }\n' +
				   'td.borderDouble p { align:center; text-align:center; }\n' +
				   '.data { z-index:200; }\n' +
				   '.image { background-position:repeat; }\n';

	return styleStr;
}

function generateCheckPdf1(request,response) {
	//general parameters
	var debugState = false;
	var closeChecks = true;
	var checkTypes = {'VendPymt':'vendorpayment', 'CustRfnd':'customerrefund', 'CashRfnd':'cashrefund', 'Check':'check'};
	var table2Types = {'VendPymt':'vendorbill', 'CustRfnd':'creditmemo', 'CashRfnd':'cashrefund', 'Check':'check'};
	var listTypes = {'VendPymt':'apply', 'CustRfnd':'apply', 'CashRfnd':'item', 'Check':'item'};
	var refTypes = {'VendPymt':'refnum', 'CustRfnd':'refnum', 'CashRfnd':'id', 'Check':'id'};
	var memoTypes = {'VendPymt':'none', 'CustRfnd':'none', 'CashRfnd':'description', 'Check':'description'};
	var amountTypes = {'VendPymt':'due', 'CustRfnd':'due', 'CashRfnd':'amount', 'Check':'amount'};
	var discTypes = {'VendPymt':'disc', 'CustRfnd':'none', 'CashRfnd':'none', 'Check':'none'};
	
	var context = nlapiGetContext();
	
	// get resources URL's
	var baseURL = request.getURL().substring(8);
	baseURL = baseURL.substring(0,baseURL.indexOf('/'));
	var checkResources = new Array();
	/*
	checkResources['font'] = '/c.1202613/suitebundle14242/arial.ttf'; //getMediaFile('printChecks/arial.ttf', baseURL).replace(/\&/gi,'&amp;');
	checkResources['date'] = getMediaFile('printChecks/IL_check_date.png', baseURL).replace(/\&/gi,'&amp;');
	checkResources['new_shekel'] = getMediaFile('printChecks/IL_check_new_shekel.png', baseURL).replace(/\&/gi,'&amp;');
	checkResources['payto'] = getMediaFile('printChecks/IL_check_payto.png', baseURL).replace(/\&/gi,'&amp;');
	checkResources['payto_heb'] = getMediaFile('printChecks/IL_check_payto_heb.png', baseURL).replace(/\&/gi,'&amp;');
	checkResources['shekel'] = getMediaFile('printChecks/IL_check_shekel.png', baseURL).replace(/\&/gi,'&amp;');
	checkResources['to'] = getMediaFile('printChecks/IL_check_to.png', baseURL).replace(/\&/gi,'&amp;');
	checkResources['void'] = getMediaFile('printChecks/IL_check_void.png', baseURL).replace(/\&/gi,'&amp;');
	*/
	checkResources['font'] = getFileURL('arial.ttf').replace(/\&/gi,'&amp;');
	checkResources['date'] = getFileURL('IL_check_date.png').replace(/\&/gi,'&amp;');
	checkResources['new_shekel'] = getFileURL('IL_check_new_shekel.png').replace(/\&/gi,'&amp;');
	checkResources['payto'] = getFileURL('IL_check_payto.png').replace(/\&/gi,'&amp;');
	checkResources['payto_heb'] = getFileURL('IL_check_payto_heb.png').replace(/\&/gi,'&amp;');
	checkResources['shekel'] = getFileURL('IL_check_shekel.png').replace(/\&/gi,'&amp;');
	checkResources['to'] = getFileURL('IL_check_to.png').replace(/\&/gi,'&amp;');
	checkResources['void'] = getFileURL('IL_check_void.png').replace(/\&/gi,'&amp;');
	
	// get filters from POST
	var checkIDsField = request.getParameter('printchecks_id_field');
	var checkIDsArray = checkIDsField.split(',');
	
	//set columns and filters for void check search
	var voidColumns = new Array();
	voidColumns[0] = new nlobjSearchColumn('tranid');
	var voidFilters = new Array();
	voidFilters[0] = new nlobjSearchFilter('mainline', null, 'is', 'T');
	voidFilters[1] = new nlobjSearchFilter('voided', null, 'is', 'F');
	
	//general variables
	var voidSearchresults = new Array();
	var tableLabel = 'חשבונית';
	var itl = 0;
	var checkArray = new Array();
	var tempTotal = 0;
	var internalID;

	for (var ita = 0; ita < checkIDsArray.length && context.getRemainingUsage() > 150; ita++) {
		var tempType = nlapiLookupField('transaction', checkIDsArray[ita], 'type');
		checkArray[ita] = new Array();
		checkArray[ita]['type'] = tempType;
		checkArray[ita]['table'] = checkTypes[tempType];
		checkArray[ita]['table2'] = table2Types[tempType];
		checkArray[ita]['list'] = listTypes[tempType];
		checkArray[ita]['refType'] = refTypes[tempType];
		checkArray[ita]['memoType'] = memoTypes[tempType];
		checkArray[ita]['amountType'] = amountTypes[tempType];
		checkArray[ita]['discType'] = discTypes[tempType];
		checkArray[ita]['internalid'] = checkIDsArray[ita];
		

		var record = nlapiLoadRecord(checkArray[ita]['table'], checkArray[ita]['internalid']);
		
		checkArray[ita]['tranid'] = record.getFieldValue('tranid');
		checkArray[ita]['trandate'] = record.getFieldValue('trandate');
		tempTotal = Math.abs(record.getFieldValue('total'));
		//if (isSubsidiarySettingOn()) tempTotal = Math.abs(record.getFieldValue('fxamount'));		
		checkArray[ita]['total'] = tempTotal;
		checkArray[ita]['totalcur'] = formatCurrency(tempTotal);
		checkArray[ita]['totaltext'] = ITComConvertNumToTextHeb(tempTotal);
		checkArray[ita]['billaddress'] = (record.getFieldValue('address') || '').replace(/\r\n|\n\r|\n|\r/gi,'<br />'); //.replace(/israel/gi,'');
		if (checkArray[ita]['billaddress'] == '') checkArray[ita]['billaddress']=parseEntity(record.getFieldText('entity'));
		checkArray[ita]['account'] = record.getFieldValue('account');
		checkArray[ita]['name'] = parseEntity(record.getFieldText('entity'));
		checkArray[ita]['memo'] = record.getFieldValue('memo');
		checkArray[ita]['status'] = record.getFieldValue('custbody_il_transaction_state');
		checkArray[ita]['billcount'] = record.getLineItemCount(checkArray[ita]['list']);
		
		//check if check is voided (can't do lookup, because voided is only in search filters)
		voidFilters[2] = new nlobjSearchFilter('internalid', null, 'is', checkIDsArray[ita]);
		voidSearchresults = nlapiSearchRecord('transaction', null, voidFilters, voidColumns);
		checkArray[ita]['voided'] = 'T';
		if (voidSearchresults != null && voidSearchresults.length > 0) checkArray[ita]['voided'] = 'F';
		
		if (checkArray[ita]['voided'] == 'F') { //check if the Check is not voided
			//get line items for list
			if (checkArray[ita]['billcount'] > 0) {
				itl = 1;
				for (var itb = 1;itb <= checkArray[ita]['billcount']*1; itb++) {
					if (checkArray[ita]['list'] == 'apply') { 
						if (record.getLineItemValue(checkArray[ita]['list'], 'apply', itb) == 'T') {
							checkArray[ita][itl] = new Array();
							checkArray[ita][itl]['billref'] = (record.getLineItemValue(checkArray[ita]['list'], checkArray[ita]['refType'], itl) || 'ללא מספר');
							checkArray[ita][itl]['billdisc'] = record.getLineItemValue(checkArray[ita]['list'], checkArray[ita]['discType'], itl);
							checkArray[ita][itl]['billamount'] = record.getLineItemValue(checkArray[ita]['list'], checkArray[ita]['amountType'], itl);
							try {
								checkArray[ita][itl]['billdate'] = nlapiLookupField(checkArray[ita]['table2'], record.getLineItemValue(checkArray[ita]['list'], 'doc', itl),'trandate');
							} catch(e) {
								checkArray[ita][itl]['billdate'] = checkArray[ita]['trandate'];
							}
							if (checkArray[ita]['memoType'] == 'none') {
								checkArray[ita][itl]['memo'] = nlapiLookupField(checkArray[ita]['table2'], record.getLineItemValue(checkArray[ita]['list'], 'doc', itl), 'memo');
							} else {
								checkArray[ita][itl]['memo'] = record.getLineItemValue(checkArray[ita]['table2'], checkArray[ita]['memoType'], itl);
							}
							// fix description to transaction memo if does not exist
							if (!checkArray[ita][itl]['memo'] || checkArray[ita][itl]['memo'] == null) checkArray[ita][itl]['memo']=checkArray[ita]['memo'];
							if (checkArray[ita][itl]['memo'] == null || checkArray[ita][itl]['memo'] == 'null') checkArray[ita][itl]['memo']='';
							itl++;
						}
					}
				}
				checkArray[ita]['billcount'] = itl-1;
			}
		} else { //if check is voided
			checkArray[ita]['total'] = 'מבוטל';
			checkArray[ita]['totalcur'] = 'מבוטל';
			checkArray[ita]['totaltext'] = 'מבוטל';
		}
		
		//close the check to block future prints
		if (closeChecks) {
			var originPrintDate = nlapiDateToString(new Date());
	        nlapiSubmitField('customrecord_il_transaction_state', checkArray[ita]['status'], ['custrecord_il_tancheck_printed', 'custrecord_il_origin_printdate'], ['T', originPrintDate]);
		}
	}
	
	//create style and content for PDF XML
	var newLine = '<br />';
	var tabChar = '&nbsp;&nbsp;&nbsp;&nbsp;';
	var str = '';
	var styleStr = '';
	var tableStr = '';
	var macroStr = '';
	var bookmarks = '';
	var tableLines = 0;
	var taxDisc = 0;
	var finalTotal = 0;
	
	//check records => tranid, trandate, total, totaltext, totalcur,
	//                 internalid, billaddress, account, name, billcount
	//                 [, 1, 2, 3...  -  bills]
	//Bill records  => billref, billdisc, billamount, billdate, memo
	str += '<body size="A4-landscape" background-macro="content0" >\n';
	
	for (var itt = 0; itt < checkArray.length; itt++) {
		try {
			if (itt > 0) {
				str += '<pbr />\n';
				str += '<pbr id="chk'+itt+'" size="A4-landscape" background-macro="content'+itt+'" />\n';
			}
			
			//set bookmark for this section
			bookmarks += ' <bookmark name="Check No. '+checkArray[itt]['tranid']+'" href="#chk'+itt+'" />\n';
			
			//print Check information
			macroStr += '<macro id="content'+itt+'">\n';
			//create background image layer
			macroStr += '<div id="chk'+itt+'" class="backgroundDiv"';
			if (checkArray[itt]['voided'] == 'T') macroStr += ' background-image="'+checkResources['void']+'"';
			macroStr += ' position="relative" >\n';
			//create image layers (titles and underlines)
			macroStr += ' <div class="addressLabelDiv1 image" background-image="'+checkResources['to']+'"><span /></div>\n';
			macroStr += ' <div class="dateDiv dateDiv1 image" background-image="'+checkResources['date']+'"><span /></div>\n';
			macroStr += ' <div class="paytoDiv1 bottomLine image" background-image="'+checkResources['payto']+'"><span /></div>\n';
			macroStr += ' <div class="paytoLabelDiv1 bottomLine image" background-image="'+checkResources['payto_heb']+'"><span />&nbsp;</div>\n';
			macroStr += ' <div class="shekelDiv1 bottomLine image" background-image="'+checkResources['shekel']+'"><span /></div>\n';
			macroStr += ' <div class="totalTextDiv1 bottomLine image" background-image="'+checkResources['new_shekel']+'"><span /></div>\n';
			macroStr += ' <div class="dateDiv checkDateDiv1 image" background-image="'+checkResources['date']+'"><span /></div>\n';
			macroStr += ' <div class="addressLabelDiv2 image" background-image="'+checkResources['to']+'"><span /></div>\n';
			macroStr += ' <div class="dateDiv dateDiv2 image" background-image="'+checkResources['date']+'"><span /></div>\n';
			macroStr += ' <div class="paytoDiv2 bottomLine image" background-image="'+checkResources['payto']+'"><span /></div>\n';
			macroStr += ' <div class="paytoLabelDiv2 bottomLine image" background-image="'+checkResources['payto_heb']+'"><span /></div>\n';
			macroStr += ' <div class="shekelDiv2 bottomLine image" background-image="'+checkResources['shekel']+'"><span />&nbsp;</div>\n';
			macroStr += ' <div class="totalTextDiv2 bottomLine image" background-image="'+checkResources['new_shekel']+'"><span /></div>\n';
			macroStr += ' <div class="dateDiv checkDateDiv2 image" background-image="'+checkResources['date']+'"><span /></div>\n';
			//information layers
			macroStr += ' <div class="idDiv"><span />Check No. '+checkArray[itt]['tranid']+' ('+(itt+1)+'/'+checkArray.length+'-'+checkArray[itt]['billcount']+')</div>\n';
			macroStr += ' <div class="addressDiv1"><span />'+checkArray[itt]['billaddress']+'</div>\n';
			macroStr += ' <div class="dateDiv1 dateDiv alignCenter data"><span />'+checkArray[itt]['trandate']+'</div>\n';
			macroStr += ' <div class="paytoDiv1 data"><span />'+checkArray[itt]['name']+'</div>\n';
			macroStr += ' <div class="totalDiv1 bottomLine alignCenter"><span />***'+checkArray[itt]['totalcur']+'***</div>\n';
			//macroStr += ' <div class="totalTextDiv1 data"><span />'+ITComConvertNumToTextHeb(Math.abs(checkArray[itt]['totalcur']))+'</div>\n';
			macroStr += ' <div class="totalTextDiv1 data"><span />'+checkArray[itt]['totaltext']+'</div>\n';
			macroStr += ' <div class="checkDateDiv1 dateDiv alignCenter data"><span />'+checkArray[itt]['trandate']+'</div>\n';
			macroStr += ' <div class="addressDiv2"><span />'+checkArray[itt]['billaddress']+'</div>\n';
			macroStr += ' <div class="dateDiv2 dateDiv alignCenter data"><span />'+checkArray[itt]['trandate']+'</div>\n';
			macroStr += ' <div class="paytoDiv2 data"><span />'+checkArray[itt]['name']+'</div>\n';
			macroStr += ' <div class="totalDiv2 alignCenter bottomLine"><span />***'+checkArray[itt]['totalcur']+'***</div>\n';
			macroStr += ' <div class="totalTextDiv2 data"><span />'+checkArray[itt]['totaltext']+'</div>\n';
			macroStr += ' <div class="checkDateDiv2 dateDiv alignCenter data"><span />'+checkArray[itt]['trandate']+'</div>\n';
			
			//print bills information
			tableStr = '';
			tableStr += '<table width="100%" border="0">\n';
			tableStr += '  <tr>\n';
			tableStr += '    <td class="borderDouble" width="16%">סכום</td>\n';
			tableStr += '    <td class="borderDouble" width="52%">פרטים</td>\n';
			tableStr += '    <td class="borderDouble" width="16%">'+tableLabel+'</td>\n';
			tableStr += '    <td class="borderDouble" width="16%">תאריך</td>\n';
			tableStr += '  </tr>\n';
			tableLines = 0;
			finalTotal = 0;
			taxDisc = 0;
			
			if (checkArray[itt]['type']=='Check') {
				tableStr += '  <tr>\n';
				tableStr += '    <td>'+checkArray[itt]['totalcur']+'</td>\n';
				tableStr += '    <td>'+checkArray[itt]['memo']+'</td>\n';
				tableStr += '    <td>&nbsp;</td>\n';
				tableStr += '    <td>'+checkArray[itt]['trandate']+'</td>\n';
				tableStr += '  </tr>\n';
				tableLines++;
				finalTotal = Math.abs(checkArray[itt]['total'] * 1);
				taxDisc = 0;
			} else if (checkArray[itt]['type']=='CashRfnd') {
				tableStr += '  <tr>\n';
				tableStr += '    <td>'+checkArray[itt]['totalcur']+'</td>\n';
				tableStr += '    <td>'+checkArray[itt]['memo']+'</td>\n';
				tableStr += '    <td>'+checkArray[itt]['tranid']+'</td>\n';
				tableStr += '    <td>'+checkArray[itt]['trandate']+'</td>\n';
				tableStr += '  </tr>\n';
				tableLines++;
				finalTotal = Math.abs(checkArray[itt]['total'] * 1);
				taxDisc = 0;
			} else {
				if (checkArray[itt]['billcount'] > 6) {
					tableStr += '  <tr>\n';
					tableStr += '    <td>&nbsp;</td>\n';
					tableStr += '    <td>קיים מספר רב של חשבוניות לשק זה,<br />';
					tableStr += 'אנא ראה פירוט חשבוניות במסמך נלווה.</td>\n';
					tableStr += '    <td>&nbsp;</td>\n';
					tableStr += '    <td>&nbsp;</td>\n';
					tableStr += '  </tr>\n';
					tableLines++;
					tableLines++;
					for (var itk = 1; itk <= checkArray[itt]['billcount']; itk++) {
						finalTotal += Math.abs(checkArray[itt][itk]['billamount'] * 1);
						taxDisc += Math.abs(checkArray[itt][itk]['billdisc'] * 1);
					}
				} else if (checkArray[itt]['billcount'] == 0) {
					tableStr += '  <tr>\n';
					tableStr += '    <td>&nbsp;</td>\n';
					tableStr += '    <td>אין חשבוניות המיוחסות לשיק זה.</td>\n';
					tableStr += '    <td>&nbsp;</td>\n';
					tableStr += '    <td>&nbsp;</td>\n';
					tableStr += '  </tr>\n';
					tableLines++;
				} else {
					for (var itk = 1; itk <= checkArray[itt]['billcount']; itk++) {
						tableStr += '  <tr>\n';
						tableStr += '    <td>' + formatCurrency(Math.abs(checkArray[itt][itk]['billamount'])) + '</td>\n';
						tableStr += '    <td>' + checkArray[itt][itk]['memo'] + '</td>\n';
						tableStr += '    <td>' + checkArray[itt][itk]['billref'] + '</td>\n';
						tableStr += '    <td>' + checkArray[itt][itk]['billdate'] + '</td>\n';
						tableStr += '  </tr>\n';

						finalTotal += Math.abs(checkArray[itt][itk]['billamount'] * 1);
						taxDisc += Math.abs(checkArray[itt][itk]['billdisc'] * 1);
						tableLines++;
					}
				}
			}
		
			//add empty lines to table
			for (var ith = 1; ith <= (6-tableLines); ith++) {
				tableStr += '  <tr>\n';
				tableStr += '    <td>&nbsp;</td>\n';
				tableStr += '    <td>&nbsp;</td>\n';
				tableStr += '    <td>&nbsp;</td>\n';
				tableStr += '    <td>&nbsp;</td>\n';
				tableStr += '  </tr>\n';
			}
			
			//add totals to table
			tableStr += '  <tr>\n';
			tableStr += '    <td>' + formatCurrency(Math.abs(finalTotal)) + '</td>\n';
			tableStr += '    <td class="borderCorner"> סה"כ</td>\n';
			tableStr += '    <td class="borderTop">&nbsp;</td>\n';
			tableStr += '    <td class="borderTop">&nbsp;</td>\n';
			tableStr += '  </tr>\n';
			tableStr += '  <tr>\n';
			tableStr += '    <td>' + formatCurrency(taxDisc) + '</td>\n';
			tableStr += '    <td class="borderSide"> ניכוי מס במקור</td>\n';
			tableStr += '    <td class="borderClean">&nbsp;</td>\n';
			tableStr += '    <td class="borderClean">&nbsp;</td>\n';
			tableStr += '  </tr>\n';
			tableStr += '  <tr>\n';
			tableStr += '    <td>' + formatCurrency(finalTotal - taxDisc) + '</td>\n';
			tableStr += '    <td class="borderSide"> סה"כ לתשלום</td>\n';
			tableStr += '    <td class="borderClean">&nbsp;</td>\n';
			tableStr += '    <td class="borderClean">&nbsp;</td>\n';
			tableStr += '  </tr>\n';
			tableStr += '</table>\n';
			
			macroStr += ' <div class="tableDiv1"><span />'+tableStr+'</div>\n';
			macroStr += ' <div class="tableDiv2"><span />'+tableStr+'</div>\n';
			macroStr += '</div>\n';
			macroStr += '</macro>\n';
		} catch(e) {
			macroStr += '</div>\n';
			macroStr += '</macro>\n';
		}
	}
	if (itt == 1) str += '<pbr />\n';
	// create style sheet for XML output
	styleStr += 'body, p, div { font:9pt/9pt Arial; vertical-align:bottom; align:right; color:#000; margin:0; padding:0 1mm 0 1mm; direction:rtl; }\n';
	styleStr += 'div { background-image-dpi:110; align:right; overflow: hidden; z-index:20; direction:rtl; }\n';
	styleStr += '.bottomLine { border-bottom:1px solid black; }\n';
	styleStr += '.dateDiv { border-bottom:1px solid black; position:absolute; width:51.04mm; height:4.64mm; }\n';
	styleStr += '.alignCenter p { align:center; }\n';
	styleStr += '.backgroundDiv { position:relative; overflow:hidden; margin:0; padding:0; width:297mm; height:210mm; background-repeat:no-repeat; size:A4-landscape; }\n';
	styleStr += '.addressDiv1 { padding:1mm; position:absolute; width:57.31mm; height:21.81mm; left: 220.19mm; top: 29.93mm; border-top:1px solid black; }\n';
	styleStr += '.addressDiv2 { padding:1mm; position:absolute; width:57.31mm; height:21.81mm; left: 93.74mm; top: 27.37mm; border:1px solid black; }\n';
	styleStr += '.addressDiv1 p, .addressDiv2 p { font:9pt/11pt Arial; vertical-align:top; }\n';
	styleStr += '.addressLabelDiv1 { position:absolute; width:57.31mm; height:4.64mm; left: 220.19mm; top: 25.29mm; }\n';
	styleStr += '.addressLabelDiv2 { position:absolute; width:57.31mm; height:4.64mm; left: 93.74mm; top: 22.73mm; }\n';
	styleStr += '.tableDiv1 { position:absolute; width:126.45mm; height:67.28mm; left: 166.13mm; top: 61.48mm; }\n';
	styleStr += '.tableDiv2 { position:absolute; width:150.82mm; height:67.28mm; left: 6.26mm; top: 61.48mm; }\n';
	styleStr += '.totalTextDiv1 { position:absolute; width:92.11mm; height:4.64mm; left: 168.22mm; top: 183.30mm; }\n';
	styleStr += '.shekelDiv1 { position:absolute; width:4.64mm; height:4.64mm; left: 260.33mm; top: 183.30mm; border-left:1px solid black; }\n';
	styleStr += '.totalDiv1 { position:absolute; width:26.68mm; height:4.64mm; left: 264.97mm; top: 183.30mm; border-right:1px solid black; }\n';
	styleStr += '.totalDiv1 p { font:8pt/9pt Arial; }\n';
	styleStr += '.totalTextDiv2 { position:absolute; width:106.73mm; height:4.64mm; left: 5.8mm; top: 183.30mm; }\n';
	styleStr += '.shekelDiv2 { position:absolute; width:4.64mm; height:4.64mm; left: 112.53mm; top: 183.30mm; border-left:1px solid black; }\n';
	styleStr += '.totalDiv2 { position:absolute; width:38.28mm; height:4.64mm; left: 117.17mm; top: 183.30mm; border-right:1px solid black; }\n';
	styleStr += '.paytoDiv1 { position:absolute; width:115.31mm; height:4.64mm; left: 168.22mm; top: 174.25mm; }\n';
	styleStr += '.paytoLabelDiv1 { position:absolute; width:8.12mm; height:4.64mm; left: 283.54mm; top: 174.25mm; background-position:repeat; }\n';
	styleStr += '.paytoDiv2 { position:absolute; width:141.53mm; height:4.64mm; left: 5.8mm; top: 174.25mm; }\n';
	styleStr += '.paytoLabelDiv2 { position:absolute; width:8.12mm; height:4.64mm; left: 147.33mm; top: 174.25mm; background-position:right bottom; }\n';
	styleStr += '.checkDateDiv1 { position:absolute; left: 240.61mm; top: 191.65mm; }\n';
	styleStr += '.checkDateDiv2 { position:absolute; left: 81.21mm; top: 191.19mm; }\n';
	styleStr += '.dateDiv1 { position:absolute; left: 164.51mm; top: 46.87mm; }\n';
	styleStr += '.dateDiv2 { position:absolute; left: 14.15mm; top: 44.78mm; }\n';
	styleStr += '.idDiv { align:left; position:absolute; left: 164.51mm; top: 2mm; width:51.04mm; height:4.64mm; }\n';
	styleStr += '.idDiv p { font:6pt/6pt Arial; align:left; color:#808080; }\n';
	styleStr += 'table, td { table-layout:fixed; border:1px solid black; }\n';
	styleStr += 'td p { font:8pt/10pt Arial; border:0; direction:rtl; align:right; text-align:right; }\n';
	styleStr += 'td.borderClean { border:0; }\n';
	styleStr += 'td.borderCorner { border-bottom:0; border-right:0; }\n';
	styleStr += 'td.borderCorner p { align:left; text-align:left; }\n';
	styleStr += 'td.borderSide { border-bottom:0; border-right:0; border-top:0; }\n';
	styleStr += 'td.borderSide p { align:left; text-align:left; }\n';
	styleStr += 'td.borderTop { border-bottom:0; border-right:0; border-left:0; }\n';
	styleStr += 'td.borderDouble { border-bottom:2px double black; }\n';
	styleStr += 'td.borderDouble p { align:center; text-align:center; }\n';
	styleStr += '.data { z-index:200; }\n';
	styleStr += '.image { background-position:repeat; }\n';
	
	//prepare xml
	var xml = '<head>\n';
	xml += '<meta name="base" value="https://'+baseURL+'" />';
	xml += '<meta name="title" value="Print Checks (NetSuite)" />\n';
	xml += '<meta name="author" value="NetSuite Israel" />\n';
	//xml += '<meta name="subject" value="Check No. - '+checkNumsField.replace('<br>',', ')+'" />\n';
	xml += '<meta name="show-bookmarks" value="true" />\n';
	xml += '<meta name="access-level" value="print-all change-none extract-none" />\n';
	//xml += '<meta name="password" value="itcom123" />\n';
	//xml += '<link name="Arial" type="font" subtype="truetype" bytes="2" src="https://system.sandbox.netsuite.com/core/media/media.nl?id=3146&c=1202613&h=a4ec7b17c43b27cffc3a&_xt=.bin" />\n';
	xml += '<link name="Arial" type="font" subtype="truetype" bytes="2" src="'+checkResources['font']+'" />\n';
	xml += '<style>\n' + styleStr + '</style>\n';
	xml += '<macrolist>\n' + macroStr + '</macrolist>\n';
	xml += '<bookmarklist>\n' + bookmarks + '</bookmarklist>\n';
	xml += '</head>\n';
	xml += str + '</body>\n';
	xml = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n<pdf>\n" + xml;
	xml += '</pdf>\n';
	
	if (!debugState) { 
		//nlapiLogExecution('DEBUG', 'Generate PDF Xml', xml);
		var file = nlapiXMLToPDF( xml );
		response.setContentType('PDF','print-checks.pdf'); // attachment/inline
		response.write( file.getValue() );
	} else {
		//xml = "<html>\n"+xml;
		//xml += '</html>\n';
		response.write( xml );
	}

}


function resetPrintCheckFlagForm(request, response) {
	if(request.getMethod() == 'GET')  {  // Stage 1 
	
		//Creating the form    
		var form = nlapiCreateForm("Israeli Reset Printed Check Flag Wizard (Select Account and Check Type)");    
		var debugState = false;
		
		//set the stage of the Check printing wizard (initial stage)
		var resultField0 = form.addField('custpage_stage', 'text', 'Wizard Stage: ');    
		resultField0.setDefaultValue('1');    
		resultField0.setDisplayType('hidden');

		// add the select field for the 'account'
	    var filters = new Array();
		filters[0] = new nlobjSearchFilter('type', null, 'is', 'Bank');
		filters[1] = new nlobjSearchFilter('custrecord_il_currencysymbol', null, 'is', 'ILS');
		//if (isSubsidiarySettingOn()) {
		//	filters[1] = new nlobjSearchFilter('subsidiary', null, 'is', nlapiGetContext().getSubsidiary());
		//}
		
		var columns = new Array();
		columns[0] = new nlobjSearchColumn('name');
		columns[0].setSort();
	    
		var accountResults = nlapiSearchRecord('account', null, filters, columns);  
		if (accountResults != null && accountResults.length > 0) {
			// create select options for account from records
		    var accountField = form.addField('printchecks_account_field','select','Select Account');
			for (i = 0; i < accountResults.length; i++) {
				accountField.addSelectOption(accountResults[i].getId(), accountResults[i].getValue('name'));
			}
	
			// create select options for transaction types
		    var accountField = form.addField('printchecks_trantype_field','select','Select Check Type');
			accountField.addSelectOption('0','All Check Types');
			accountField.addSelectOption('Check','Check');
			accountField.addSelectOption('VendPymt','Vendor Payment');
			accountField.addSelectOption('CustRfnd','Customer Refund');
			accountField.addSelectOption('CashRfnd','Cash Refund');
	
			form.addSubmitButton('Submit and go to Select Check Numbers >>');		    
		} else {
			var msg = 'There are no Checks or relevant accounts in this system.';
			var resultField4 = form.addField('printchecks_error_message', 'textarea', '');
			resultField4.setDefaultValue(msg);
			resultField4.setDisplayType('inline');
		}
		
		response.writePage(form);	
		
	} else {    //POST call
	
		if (request.getParameter('custpage_stage') == '1') { // Stage 2
			
			var form = nlapiCreateForm("Israeli Reset Printed Check Flag Wizard (Select Check to be Reset)");
			var debugState = false;
			
			//set the stage of the Check printing wizard (second stage)
			var resultField0 = form.addField('custpage_stage', 'text', 'Wizard Stage: ');
			resultField0.setDefaultValue('2');
			resultField0.setDisplayType('hidden');
			
			// get filters from POST
			var accountFilter = request.getParameter('printchecks_account_field');
			// recreate account filter from POST
			var resultField1 = form.addField('printchecks_account_field', 'text', 'Account to be Used: ');
			resultField1.setDefaultValue(accountFilter);
			resultField1.setDisplayType('hidden');
			var resultField1txt = form.addField('printchecks_account_text_field', 'text', 'Account to be Used: ');
			resultField1txt.setDefaultValue(nlapiLookupField('account',accountFilter,'name'));
			resultField1txt.setDisplayType('inline');

			// recreate check type filter from POST
			var typeFilter = request.getParameter('printchecks_trantype_field');
			var resultField2 = form.addField('printchecks_trantype_field', 'text', 'Check Type to be Used: ');
			var typeFilterArray = new Array();
			if (typeFilter == '' || typeFilter == '0') {
				typeFilterArray = ['Check', 'VendPymt','CustRfnd', 'CashRfnd']; //, 'LiabPymt', 'TaxLiab'];
				resultField2.setDefaultValue('All Check Types');
			}
			else {
				typeFilterArray = [typeFilter]
				resultField2.setDefaultValue(typeFilter);
			}
			resultField2.setDisplayType('inline');
			
			// add 2 select fields for the 'from' and 'to' range of Checks
			var filters = new Array();
			filters[0] = new nlobjSearchFilter('mainline', null, 'is', 'T');
			filters[1] = new nlobjSearchFilter('type', null, 'anyof', typeFilterArray);
			filters[2] = new nlobjSearchFilter('account', null, 'is', accountFilter);
			filters[3] = new nlobjSearchFilter('custbody_il_transaction_state', null, 'noneof', '@NONE@');
			filters[4] = new nlobjSearchFilter('custrecord_il_tancheck_printed', 'custbody_il_transaction_state', 'is', 'T');
			
			// Set Columns
			var columns = new Array();			
			columns[0] = new nlobjSearchColumn('tranid');
			columns[1] = new nlobjSearchColumn('type');
			columns[0].setSort();
			
			var tranIDresults = nlapiSearchRecord('transaction', null, filters, columns);
			
			// create select options from records
			if (tranIDresults != null && tranIDresults.length > 0) {
				var fromNo = form.addField('printchecks_from_field', 'select', 'Reset Check No.');
				for (var itc = 0; itc < tranIDresults.length; itc++) {
					fromNo.addSelectOption(tranIDresults[itc].getId(), tranIDresults[itc].getValue('tranid'));
				}
				form.addSubmitButton('Submit and Reset Selected Check');
			} else {
				var msg = 'There are no Checks in this category.';
				msg += '<br />Please press the button to go back to the previous page...';
				var resultField4 = form.addField('printchecks_error_message', 'textarea', '');
				resultField4.setDefaultValue(msg);
				resultField4.setDisplayType('inline');
				form.addButton('custpage_back_button', '<< Go back to the previous page', 'history.go(-1)');
			}
			
			response.writePage(form);
			
		} else if (request.getParameter('custpage_stage') == '2') { // Stage 3
			
			var form = nlapiCreateForm("Israeli Reset Printed Check Flag Wizard (Reset Operation Done)");

			var fromNo = request.getParameter('printchecks_from_field');
			var stateRecordID = nlapiLookupField('transaction', fromNo, 'custbody_il_transaction_state');
	        nlapiSubmitField('customrecord_il_transaction_state', stateRecordID, 'custrecord_il_tancheck_printed', 'F');

			var startURL = nlapiResolveURL('SUITELET','customscript_il_print_checks_reset', 'customdeploy_il_print_checks_reset');
			form.addButton("custpage_exitbutton", "Done", "document.location ='" + startURL + "';");
			response.writePage(form);

		}
	}
}




/***********************************************************************
 ***                          COMMON FUNCTIONS                       ***
 ***********************************************************************/

/////////////////////////////////////////////////////////////////
//  Get resource file from bundle:
//	While in development, resource files (images, text, etc.) can be stored
//	in   "/SuiteBundles/Bundle 100/" and even distributed inside subdirectories.
//	When a bundle is created, the files are automatically moved to the bundle
//	directory (for example:  "/SuiteBundles/Bundle 13657/"), at which time
//	this function will return the actual URL to these files under that directory.
/////////////////////////////////////////////////////////////////

function getMediaFile(fileName, baseURL) {
	var context = nlapiGetContext(); //nlapiGetContext().getScriptId()
	var bundleID = context.getBundleId();
	if (bundleID != '') {
		if (fileName.indexOf('/') != -1) fileName = fileName.substring(fileName.lastIndexOf('/') + 1);
	} else {
		bundleID = '100';
	}
	return 'https://'+baseURL+'/c.'+context.getCompany()+'/suitebundle'+bundleID+'/'+fileName;
}


function getFileURL(fileName) {
	var folderName = null;
	var pathParts = fileName.split('\/');
	if(pathParts.length > 1) {
		folderName = pathParts[pathParts.length - 2];
		fileName = pathParts[pathParts.length - 1];
	}
	
    var results = nlapiSearchRecord('file', null, [new nlobjSearchFilter('name', null, 'is', fileName)], [new nlobjSearchColumn('url'), new nlobjSearchColumn('folder')]);
	if(results != null) {
		if (folderName == null) {
			return results[0].getValue('url');
		}
		else {
			for (var i = 0; i < results.length; i++) {
				var rec = results[i];
				if (rec.getText('folder') == folderName) {
					return rec.getValue('url');
				}
			}
		}
	}
    return null;
} 

/////////////////////////////////////////////////////////////////
//   End of URL get functions
/////////////////////////////////////////////////////////////////


function parseEntity(checkRecord) {

	var recType = checkRecord.getRecordType();
	var recId = checkRecord.getId();
	var entityId = checkRecord.getFieldValue('entity');
	
	var entityType = getRecordScriptId('entity', entityId);
	
	switch(entityType) {
		case 'vendor':
			var vendorChechkNamePref = nlapiGetContext().getSetting('SCRIPT', 'custscript_il_vendor_checkname');
			var vendorChechkNamePrefText = '';
			if(!isNullOrEmpty(vendorChechkNamePref)) {
				vendorChechkNamePrefText = nlapiLookupField('customrecord_il_vendor_check_name', vendorChechkNamePref, 'name');
			}

			if(vendorChechkNamePrefText.toLowerCase().indexOf('legal') != -1) {
				var legalName = nlapiLoadRecord('vendor', entityId).getFieldValue('legalname');
				return legalName;
			}
			else {
				var companyName = nlapiLookupField('vendor', entityId, 'companyname');
				return companyName;
			}
			break;
			
		case 'contact':
		case 'customer':
			var customerData = nlapiLookupField('customer', entityId, ['companyname', 'firstname', 'lastname']);
			return customerData.firstname + ' ' + customerData.lastname + customerData.companyname;
			break;
		
		case 'employee':
			var employeeData = nlapiLookupField('employee', entityId, ['firstname', 'lastname']);
			return employeeData.firstname + ' ' + employeeData.lastname;
			break;
			
		default:
			/*var entityId = nlapiLookupField(recType, recId, ['employee.entityid', 'customer.companyname']);
			return entityId['employee.entityid'] + entityId['customer.companyname'];*/
			break;
	}

	
}

function isSubsidiarySettingOn() { 
    var isFeatureOn = true;
    var featureStatus = nlapiGetContext().getSetting('FEATURE', 'SUBSIDIARIES');
    if( featureStatus == 'F' ) {  isFeatureOn = false; }
    return isFeatureOn;
}

function formatCurrency(num) { // makes strings and numbers into comma grouped and 2 decimal places currency strings
	num = num.toString().replace(/\$|\,/g,'');
	if (isNaN(num)) num = '0';
	sign = (num == (num = Math.abs(num)));
	num = Math.floor(num * 100+0.50000000001);
	cents = num%100;
	num = Math.floor(num / 100).toString();
	if(cents < 10) cents = '0' + cents;
	for (var i = 0; i < Math.floor((num.length - (1 + i)) / 3); i++) {
		num = num.substring(0, num.length - (4 * i + 3)) + ',' + num.substring(num.length - (4 * i + 3));
	}
	
	return (((sign) ? '':'-') + num + '.' + cents);
}

function isNumeric(sText, nType) { // checks if string is numeric [nType => 0=Integer, 1=floating, 2=formatted (with commas)] 
	if (!nType) var nType = 0;
	var isNumber=true;
	var validChars = '';
	switch(nType) {
		case 1:
		  validChars = '0123456789.-';
		  break;
		case 2:
		  validChars = '0123456789.,-';
		  break;
		default:
		  validChars = '0123456789';
	}
	
	if (sText.replace(/^\s+|\s+$/g,"") == '') isNumber = false; // check if spaces or null string.
	
	for (var i = 0; i < sText.length && isNumber; i++) { 
		if (validChars.indexOf(sText.charAt(i)) == -1) isNumber = false;
	}
	
	return isNumber;
}

String.prototype.trim = function() { // trim spaces off of both sides of a string
	return this.replace(/^\s+|\s+$/g,"");
}

function isNullOrEmpty(val) {
	if(typeof(val) == 'undefined' || val == null || (typeof(val) == 'string' && val.length == 0)) {
		return true;
	}
	return false;
}

function getRecordScriptId(abstractType, recordId) {
	var res = nlapiSearchRecord(abstractType, null, [new nlobjSearchFilter('internalid', null, 'is', recordId)]);
	if(res != null) {
		return res[0].getRecordType();
	}
	
	return null;
}

function ITComConvertNumToTextHeb(numValue) { //ITCom Convert numbers to Hebrew text for checks amount
	var numbers = new Array();
	numbers[0] = new Array('','','','עשרה','');
	numbers[1] = new Array('מאה','','אחד','אחד עשר','אלף');
	numbers[2] = new Array('מאתיים','עשרים','שניים','שניים עשר','אלפיים');
	numbers[3] = new Array('שלוש מאות','שלושים','שלושה','שלושה עשר','שלושת אלפים');
	numbers[4] = new Array('ארבע מאות','ארבעים','ארבעה','ארבעה עשר','ארבעת אלפים');
	numbers[5] = new Array('חמש מאות','חמישים','חמישה','חמישה עשר','חמשת אלפים');
	numbers[6] = new Array('שש מאות','ששים','ששה','ששה עשר','ששת אלפים');
	numbers[7] = new Array('שבע מאות','שבעים','שבעה','שבעה עשר','שבעת אלפים');
	numbers[8] = new Array('שמונה מאות','שמונים','שמונה','שמונה עשר','שמונת אלפים');
	numbers[9] = new Array('תשע מאות','תשעים','תשעה','תשעה עשר','תשעת אלפים');

	var quadrants = new Array('מיליון','אלף','');
	
	var ands = new Array(' ',' ',' ו',' ',' ');
	
	//pad integer part of number with zeros to a nine digit string
	var numStr = Math.floor(Math.abs(numValue)) + '';
	while (numStr.length < 9) numStr = '0' + numStr;
	var intStr = new Array();
	//disect the 9 digit number into 3 quarants (millions, thousands, and singles)
	intStr[0] = numStr.substring(0,3);
	intStr[1] = numStr.substring(3,6);
	intStr[2] = numStr.substring(6);
	
	//pad mod part of number with zeros to a 2 digit string
	//var modStr = Math.round((numValue-parseInt(numValue))*100); //parseInt(numValue%1*100);
	//while (modStr.length < 2) modStr = '0' + modStr;
	var modStr = formatCurrency(numValue);
	modStr = modStr.substring(modStr.indexOf('.')+1);
	
	//converting integer digits to words from MSB to LSB
	var finalText = '';
	var digitValue;
	var specialCase;
	var tempStr;
	var revPos;
	
	for (i=0; i<3; i++) {
		//looking for special cases
		specialCase = 0;
		if (intStr[i].charAt(1)=='1') specialCase = 1;
		if (i==1 && intStr[i].substring(0,2)=='00') specialCase = 2;
		if (i==0 && intStr[i]=='001') specialCase = 3;
		if (intStr[i].charAt(2)=='0' && intStr[i].charAt(1)!='0') specialCase = 5;
		if (i==1 && intStr[i]=='010') specialCase = 4;
		
		for (j=0; j<3; j++) {
			digitValue = parseInt(intStr[i].charAt(j));
			switch (specialCase) {
				case 1:
					tempStr = numbers[digitValue][j];
					if (j==2) tempStr = numbers[digitValue][3];
					break;
					
				case 2:
					tempStr = numbers[digitValue][4];
					break;
					
				case 3:
					tempStr = '';
					j=2;
					break;
					
				case 4:
					tempStr = 'עשרת אלפים';
					j=3;
					break;
					
				case 5:
					if (j==1) {
						tempStr = 'ו' + numbers[digitValue][j];
					} else {
						tempStr = numbers[digitValue][j];
					}
					break;
					
				default:
					tempStr = numbers[digitValue][j];
			}
			if (tempStr!='')  finalText = finalText + ands[j] + tempStr;
		}
		
		//add the quadrant denominator
		if (specialCase!=2 && specialCase!=4 && intStr[i]!='000') finalText = finalText + ' ' + quadrants[i];
		
		//remove unnecessary 'ands'
		revPos = 0;
		while (revPos < finalText.length && (finalText.charAt(revPos)==' ' || finalText.charAt(revPos)=='ו')) revPos++;
		finalText = finalText.substring(revPos);
	}
	
	//adding mod text and cleanup
	tempStr = '';
	if (numStr!='000000000') {
		finalText = finalText + ' ש"ח';
		tempStr=' ו- ';
	}
	if (modStr != '00') finalText = finalText + tempStr + modStr + ' אגורות';
	finalText.replace('  ',' ');
	
	//document.getElementById('container').innerHTML=finalText;
	return finalText;
}


function serializeParameters(hashtable) {
    var params = "";
    for(var key in hashtable) params += "&" + key + "=" + hashtable[key];
    if(params.length > 0) params = params.substring(1,params.length);
    
    return params;
}

Array.prototype.addRange = function(arr2) {
	for (var i = 0; i < arr2.length; i++) {
		this.push(arr2[i]);
	}
}

function searchResultsToArray(data) {
	var result = null;
	if(data != null) {
		result = new Array(data.length);
		for(var i = 0; i < result.length; i++)
		{
			result[i] = data[i];
		}
	}	
	return result;
}

function getRecords(recordType, filters, columns, maxRows) {
	
	var search = nlapiCreateSearch(recordType, filters, columns);
	var resultSet = search.runSearch();
	
	var searchresults = null;
	var start = 0;
	var end = 1000;
	
	if(typeof(maxRows) != 'undefined' && !isNaN(maxRows)) {
		end = maxRows*1;
	}
	
	do {
		var searchresultSlice = resultSet.getResults(start, end);
		if (searchresultSlice != null) {
			if(searchresults == null) {
				searchresults = [];
			}
			searchresultSlice = searchResultsToArray(searchresultSlice);
			searchresults.addRange(searchresultSlice);
		}
		
		start += 1000;
		end += 1000;
	}
	while(end == 1000 && searchresultSlice != null && searchresultSlice.length >= 1000);
	
	return searchresults;
}

