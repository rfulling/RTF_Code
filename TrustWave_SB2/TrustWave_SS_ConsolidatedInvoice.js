/**
* Copyright (c) 1998-2012 NetSuite, Inc.
* 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
* All Rights Reserved.
* 
* This software is the confidential and proprietary information of
* NetSuite, Inc. ("Confidential Information"). You shall not
* disclose such Confidential Information and shall use it only in
* accordance with the terms of the license agreement you entered into
* with NetSuite.
* 
* TrustWave requires a SuiteScript automation that will create Consolidated/Virtual Invoice 
* for all or specifically selected customers via a server-side Suitelet (a popup browser window), 
* this script is triggered when a user navigates to NetSuite custom link menu and selects 
* "Generate Consolidated Invoices". 
* When a user clicks on this custom link the script will display a pop-up browser window 
* allowing user to select all or particular customer that requires a consolidated invoice.
* 
* 
* @author Jaime Villafuerte III
* @version 1.0
*/
function service(request,response)
{
    try
    {
        nlapiLogExecution('DEBUG','Suitelet Script','|----------STARTED----------|');
        
        //request parameters
        var stStartDate   = request.getParameter('custpage_startdate');
        var stEndDate     = request.getParameter('custpage_enddate');
        var stSubmit      = request.getParameter('custpage_submit');
        var stRefresh     = request.getParameter('custpage_refresh');
        var stRedirectURL = nlapiGetContext().getSetting('SCRIPT','custscript_tw_redirect_url');
        
        //create the form
        var objForm  = nlapiCreateForm('Consolidate Invoice',false);
        
        //if the suitelet is submitted
        if(stSubmit=='T')
        {
            var count = request.getLineItemCount('custpage_customer');
            var arrCustomers  = [];
			//var arrInvCategories = [];
            
            for(var i=1; i<=count; i++)
            {
                var stCustId   = request.getLineItemValue('custpage_customer','custpage_cust_name',i);
                var isSelected = request.getLineItemValue('custpage_customer','custpage_select',i);
				var stInvCategory = request.getLineItemValue('custpage_customer','custpage_ci_category_id',i);
                
                if(isSelected=='T')
                {
                    arrCustomers.push(stCustId + '|' + stInvCategory);					
					//if (!inArray(stInvCategory, arrInvCategories)) arrInvCategories.push(stInvCategory);
                }
            }
            
            if (arrCustomers.length > 0)
            {
                var arrParam = [];
                    arrParam['custscript_ci_customers'] = arrCustomers.join(',');
					//arrParam['custscript_ci_inv_categories'] = arrInvCategories.join(',');
                    arrParam['custscript_ci_startdate'] = stStartDate;
                    arrParam['custscript_ci_enddate']   = stEndDate;                    
                
                var stScriptStatus = nlapiScheduleScript('customscript_tw_create_consolidated_inv', 'customdeploy_tw_create_consolidated_inv', arrParam);
                redirectPage(objForm,stRedirectURL);
                response.writePage(objForm);
                return;
            }
            else
            {
                nlapiLogExecution('DEBUG', '****Creation of Consolidated Invoice is not processed.****', 'No Consolidated Invoice will be processed due to invoices result within the given date range');
            }
        }
        
        //start displaying the form here
        objForm.setScript('customscript_consolidated_inv_client');
        
        var objStartDate = objForm.addField('custpage_startdate','date','Start Date');
            objStartDate.setMandatory(true);
            objStartDate.setDefaultValue(stStartDate);
        var objEndDate = objForm.addField('custpage_enddate','date','End Date');
            objEndDate.setMandatory(true);
            objEndDate.setDefaultValue(stEndDate);
        
        //add sublist to the form
        var objSublist = objForm.addSubList('custpage_customer','list','Customer');
        
        //sublist columns
        objSublist.addField('custpage_select','checkbox','Consolidate');
        var fld = objSublist.addField('custpage_cust_name','select','Customer Name','customer');
            fld.setDisplayType('inline');
		var fldCICategoryId = objSublist.addField('custpage_ci_category_id', 'text', 'CI Category');
		    fldCICategoryId.setDisplayType('hidden');
		var fldCICategoryName = objSublist.addField('custpage_ci_category_name', 'text', 'CI Category');
        
        //sublist buttons        
        objSublist.addMarkAllButtons();
        
        //if trigger is refresh
        if(stRefresh=='T')
        {
            var arrCustomers = getAllCustomers(stStartDate,stEndDate);
            var arrValues    = [];
            
            if(arrCustomers)
            {
                for(var i=1; arrCustomers && i<=arrCustomers.length; i++)
                {
                    var arrList = [];
                    var stCustId   	 	 = arrCustomers[i-1].getValue('internalid','customerMain','GROUP');
					var stCICategoryId 	 = arrCustomers[i-1].getValue('custbody_ci_category',null,'GROUP');
					var stCICategoryName = arrCustomers[i-1].getText('custbody_ci_category',null,'GROUP');
                    //nlapiLogExecution('DEBUG','In Loop: arrCustomer' , 'stCustId=' + stCustId);
                    
                    arrList['custpage_select']      	 = 'F';
                    arrList['custpage_cust_name']   	 = stCustId;
					arrList['custpage_ci_category_id']   = stCICategoryId;
					arrList['custpage_ci_category_name'] = stCICategoryName;
                    
                    arrValues.push(arrList);
                }
                
                objSublist.setLineItemValues(arrValues);
                
                //add submit button only when it has results
                objForm.addSubmitButton('Submit');
            }
            else
            {
                var NOCUSTOMERMESSAGE = 'No Customer Invoice Record To Consolidate';
                var fldSuccessMessage = objForm.addField('custpage_success_message','inlinehtml','');
                fldSuccessMessage.setDefaultValue('<html><head><script>alert("' + NOCUSTOMERMESSAGE + '")</script></head><body></body></html>');
            }
        }
        
        //submit flag field
        var objIsSubmit = objForm.addField('custpage_submit','checkbox','');
            objIsSubmit.setDisplayType('hidden');
            objIsSubmit.setDefaultValue('T');
        
        //refresh flag field
        var objIsRefresh = objForm.addField('custpage_refresh','checkbox','');
            objIsRefresh.setDisplayType('hidden');
            objIsRefresh.setDefaultValue('F');
        
        //add refresh button
        objForm.addButton('custpage_refresh_btn','Refresh','refresh();');
        
        response.writePage(objForm);
        
        nlapiLogExecution('DEBUG','Suitelet Script','|----------FINISHED----------|');
    }
    catch(error)
    {
        if (error.getDetails != undefined)
        {
            nlapiLogExecution('ERROR','Process Error', error.getCode() + ': ' + error.getDetails());
            throw error;
        }
        else
        {
            nlapiLogExecution('ERROR','Unexpected Error', error.toString());
            throw nlapiCreateError('99999', error.toString());
        }
    }
}


/**
* Copyright (c) 1998-2012 NetSuite, Inc.
* 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
* All Rights Reserved.
* 
* This software is the confidential and proprietary information of
* NetSuite, Inc. ("Confidential Information"). You shall not
* disclose such Confidential Information and shall use it only in
* accordance with the terms of the license agreement you entered into
* with NetSuite.
* 
* This script creates a consolidated invoice custom record
* 
* @author Jaime Villafuerte III
* @version 1.0
*/
function scheduled_CreateConsolidatedInvoice()
{   
    nlapiLogExecution('DEBUG','Scheduled Script: Create Consolidated Invoice','|----------STARTED----------|');
    
    var USAGE_LIMIT   = 1000;
    var objContext    = nlapiGetContext();   
    var CI_START_DATE = objContext.getSetting('SCRIPT','custscript_ci_startdate');
    var CI_END_DATE   = objContext.getSetting('SCRIPT','custscript_ci_enddate');
    var CI_CUSTOMERS  = objContext.getSetting('SCRIPT','custscript_ci_customers'); //ABC|1, Chester|1$2, XYZ|3
	//var CI_CATEGORIES = objContext.getSetting('SCRIPT','custscript_ci_inv_categories');
    var arrCustomers  = CI_CUSTOMERS.split(',');
	var arrCategories = null;
	//if (!isEmpty(CI_CATEGORIES))
	//{
		//var arrCategories = arrCategories.split(',');
	//}
	
    var arrInvCreated = [];
    //nlapiLogExecution('DEBUG','Parameters','CI_START_DATE=' + CI_START_DATE + ' CI_END_DATE=' + CI_END_DATE + ' CI_CUSTOMERS=' + CI_CUSTOMERS);
    
    for(var i=0; i<arrCustomers.length; i++)
    {
        if((nlapiGetContext().getRemainingUsage()<USAGE_LIMIT) && ((i + 1)<arrCustomers.length))
        {
            var status = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
            
            if(status == 'QUEUED')
            {
                nlapiLogExecution('DEBUG','Script Exit and Rescheduled','Rescheduling Due To Usage Limit');
			    return;
            }
        }
        
        var arrCustCategory   = arrCustomers[i].split('|');        
        var stCustomerId      = arrCustCategory[0];
        var stInvCategory     = arrCustCategory[1];
        var arrInvResult      = getAllCustomersInvoices(stCustomerId,stInvCategory,CI_START_DATE,CI_END_DATE);
        var arrAddrResult     = getAllCustomerShipAddress(stCustomerId,CI_START_DATE,CI_END_DATE);
        var arrShipToAddress  = [];        
        
        for (var x = 0; arrAddrResult && x < arrAddrResult.length; x++)
        {
            var shpadr = arrAddrResult[x].getValue('shipaddress', null, 'GROUP');
            
            for (var y = 0; y < arrInvResult.length; y++)
            {
                var stInvAddr = arrInvResult[y].getValue('shipaddress');                
                
                if (shpadr == stInvAddr)
                {
                    var stInvId    = arrInvResult[y].getId();
                    var stPONo     = arrInvResult[y].getValue('otherrefnum');
					var stTranDate = arrInvResult[y].getValue('trandate');
						objDuedate = (stTranDate) ? stTranDate : '';       
                    var objDuedate = arrInvResult[y].getValue('duedate');
                        objDuedate = (objDuedate) ? nlapiStringToDate(objDuedate) : '';                      
                    var stTerms    = arrInvResult[y].getValue('terms');
                    //nlapiLogExecution('DEBUG','InLoop:arrInvResult','stInvId=' + stInvId + ' stPONo=' + stPONo + ' objDuedate=' + objDuedate + ' stTerms=' + stTerms);
                    
                    if (!arrShipToAddress[shpadr])
                    {
                        arrShipToAddress[shpadr] = [];
                    }                    
                    arrShipToAddress[shpadr].push([stInvId,stPONo,objDuedate,stTerms,stTranDate]);
                }
            }
        }
        
        //loop through each invoices per ship to address
        for(shipaddress in arrShipToAddress)
        {
            var arrInvDetails = arrShipToAddress[shipaddress]; //getInvoiceIds(arrInvResult);
            var arrCollected  = collectInvoice(arrInvDetails);
            var arrInvoices   = arrCollected[0];//arrInvIDs;
            var arrInvPOs     = arrCollected[1];//arrInvPOs;
            var stInvPOs      = (arrInvPOs.length>0) ? arrInvPOs.join(',') : '';
            var stInvDueDt    = arrCollected[2];//stCIDueDate;
            var stInvTerms    = arrCollected[3];//stCITerms;
			var stInvDate	  = arrCollected[4];//Invoice Date - added 8/22: wbermudo;
            nlapiLogExecution('DEBUG','In Loop: arrInvResult',' arrInvoices=' + arrInvoices);
            
            //create the consolidated invoice
            var objConsInv = nlapiCreateRecord('customrecord_consolidated_invoice');
                objConsInv.setFieldValue('custrecord_ci_customer',stCustomerId);
                objConsInv.setFieldValue('custrecord_ci_svc_start_date',CI_START_DATE);
                objConsInv.setFieldValue('custrecord_ci_svc_end_date',CI_END_DATE);
                objConsInv.setFieldValues('custrecord_ci_related_invoices',arrInvoices);
                objConsInv.setFieldValue('custrecord_ci_ship_to_address',shipaddress);
                objConsInv.setFieldValue('custrecord_ci_po_ids',stInvPOs);
                objConsInv.setFieldValue('custrecord_ci_due_date',stInvDueDt);
                objConsInv.setFieldValue('custrecord_ci_terms',stInvTerms);
				objConsInv.setFieldValue('custrecord_ci_invoice_date',stInvDate);//added 8/22 - wbermudo
            
            var stConsInvId = nlapiSubmitRecord(objConsInv,true,true);
            //nlapiLogExecution('DEBUG','Consolidated Invoice Created', 'stConsInvId=' + stConsInvId);
            
            try
            {
                //associate the consolidated invoice to invoice
                associateCIToInvoice(stConsInvId,arrInvoices);
            }
            catch(e)
            {
                nlapiLogExecution('ERROR','Error in associating consolidated invoice record:' + stConsInvId + 'to customer invoices:' + arrInvoices.join(',') ,e.toString());
                continue;
            }          
            
            //push the newly created ci to array
            arrInvCreated.push(stConsInvId);
        }
    }
    
    if(arrInvCreated.length>0)
    {
        var stInvCreated = arrInvCreated.join(',');
        var arrParam = [];
            arrParam['custscript_tw_consolidated_inv_ids'] = stInvCreated;
        nlapiScheduleScript('customscript_tw_create_consolidated_pdf',null,arrParam);
    }
    
    nlapiLogExecution('DEBUG','Scheduled Script: Create Consolidated Invoice','|----------FINISHED----------|');
}


/**
* Copyright (c) 1998-2012 NetSuite, Inc.
* 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
* All Rights Reserved.
* 
* This software is the confidential and proprietary information of
* NetSuite, Inc. ("Confidential Information"). You shall not
* disclose such Confidential Information and shall use it only in
* accordance with the terms of the license agreement you entered into
* with NetSuite.
* 
* This script creates the consolidated invoice pdf and save the file in the file cabinet
* 
* @author Jaime Villafuerte III
* @version 1.0
*/
function createConsolidatedPDF()
{
    try
    {   
        //nlapiLogExecution('DEBUG','Scheduled Script: Consolidated Invoice PDF','|----------STARTED----------|');
        
        //script parameters
        var USAGE_LIMIT     = 1000;
        var stURLLogo       = nlapiGetContext().getSetting('SCRIPT','custscript_tw_url_logo');
        var stXMLTemplate   = nlapiGetContext().getSetting('SCRIPT','custscript_tw_xml_template');
        var stXMLHeader     = nlapiGetContext().getSetting('SCRIPT','custscript_tw_xml_header_id');
        var stFolder        = nlapiGetContext().getSetting('SCRIPT','custscript_tw_folder');
        var stSender        = nlapiGetContext().getSetting('SCRIPT','custscript_tw_email_sender');
        var stSubject       = nlapiGetContext().getSetting('SCRIPT','custscript_tw_email_subj');
        var stEmailTemplate = nlapiGetContext().getSetting('SCRIPT','custscript_tw_email_template_id');
        var stCIIDs         = nlapiGetContext().getSetting('SCRIPT','custscript_tw_consolidated_inv_ids');
        //nlapiLogExecution('DEBUG','Script Parameters' ,'stURLLogo=' + stURLLogo + ' stXMLTemplate=' + stXMLTemplate + ' stXMLHeader=' + stXMLHeader + ' stCIIDs=' + stCIIDs);
        //nlapiLogExecution('DEBUG','Script Parameters' ,'stFolder=' + stFolder + ' stSender=' + stSender + ' stSubject=' + stSubject + ' stEmailTemplate=' + stEmailTemplate);
        
        //configuration parameters
        var recConfig   = nlapiLoadConfiguration('companyinformation');
        var stLogoURL   = recConfig.getFieldValue('formlogo');
        var stAddress   = setAddressMargin(recConfig.getFieldValue('addresstext'));
        var stAdrHeader = setAddressMargin(recConfig.getFieldValue('addresstext'),recConfig,'header');
        var stCompName  = recConfig.getFieldValue('companyname');
        var stPhoneNo   = recConfig.getFieldValue('phone');
        var stTaxNo     = recConfig.getFieldValue('taxid');
        var stEmail     = recConfig.getFieldValue('email');
        var stFaxNo     = recConfig.getFieldValue('fax');
        //nlapiLogExecution('DEBUG','Configuration Parameters','stLogoURL='  + stLogoURL  + ' stAddress=' + stAddress);
        //nlapiLogExecution('DEBUG','Configuration Parameters','stCompName=' + stCompName + ' stPhoneNo=' + stPhoneNo);
        //nlapiLogExecution('DEBUG','Configuration Parameters','stPhoneNo='  + stPhoneNo  + ' stTaxNo='   + stTaxNo);
        //nlapiLogExecution('DEBUG','Configuration Parameters','stEmail='    + stEmail    + ' stFaxNo='   + stFaxNo);
        
        //load the main xml template file
        var objFile = nlapiLoadFile(stXMLTemplate);
        
        //search all ci invoice for consolidation
        var arrInvoices = getAllCIInvoicesForConsolidation(stCIIDs);
        //nlapiLogExecution('DEBUG','createConsolidatedPDF','arrInvoices=' + arrInvoices);
        
        for(var i=0; arrInvoices && i<arrInvoices.length; i++)
        {
            if((nlapiGetContext().getRemainingUsage()<USAGE_LIMIT) && ((i + 1)<arrInvoices.length))
            {
                var status = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
                
                if(status == 'QUEUED')
                {
                    nlapiLogExecution('DEBUG','Script Exit and Rescheduled','Rescheduling Due To Usage Limit');
    			    return;
                }
            }
            
            var stCIID = arrInvoices[i].getId();
            //nlapiLogExecution('DEBUG','Consolidated Invoice PDF','***Started Processing Consolidated Invoice ID:' + stCIID + '***');
            
            var stRelInvoices = arrInvoices[i].getValue('custrecord_ci_related_invoices');
            //nlapiLogExecution('DEBUG','In Loop: arrInvoices','stRelInvoices=' + stRelInvoices);
            
            if(stRelInvoices)
            {
                var stCITranId       = arrInvoices[i].getValue('name');
                var stCICreateDate   = arrInvoices[i].getValue('created');
				var stCIInvoiceDate  = arrInvoices[i].getValue('custrecord_ci_invoice_date'); //added 8/22 - wbermudo
					stCIInvoiceDate  = (stCIInvoiceDate) ? stCIInvoiceDate : ''; //added 8/22 - wbermudo
                var stCICustomer     = arrInvoices[i].getValue('custrecord_ci_customer');
                var stCICustomerText = nlapiEscapeXML(arrInvoices[i].getText('custrecord_ci_customer'));
                var stCIStartDate    = arrInvoices[i].getValue('custrecord_ci_svc_start_date');
                    stCIStartDate    = (stCIStartDate) ? formatCIDate(stCIStartDate) : '';
                var stCIEndDate      = arrInvoices[i].getValue('custrecord_ci_svc_end_date');
                    stCIEndDate      = (stCIEndDate) ? formatCIDate(stCIEndDate) : '';
                //var stCustBillAddr   = setAddressMargin(arrInvoices[i].getValue('billaddress','CUSTRECORD_CI_CUSTOMER'));
                var stCustShipAddr   = setAddressMargin(arrInvoices[i].getValue('custrecord_ci_ship_to_address'));
                var stCustEmail      = arrInvoices[i].getValue('email','CUSTRECORD_CI_CUSTOMER');
                var stCustPaperless  = arrInvoices[i].getValue('custentity_ci_paperless','CUSTRECORD_CI_CUSTOMER');
                var stTranCurrency   = arrInvoices[i].getText('custrecord_ci_tran_currency');                
                var arrRelInvoices   = stRelInvoices.split(',');
                var arrAllInvLines   = [];
                var arrInvoiceTotals = [];
                var grandtaxtotal    = 0.00;
                var grandtotal       = 0.00;
                
                //added aug 8,2012
                var stTerms    = arrInvoices[i].getText('custrecord_ci_terms');
                    stTerms    = (stTerms) ? stTerms : '';
                var stDueDate  = arrInvoices[i].getValue('custrecord_ci_due_date');
                    stDueDate  = (stDueDate) ? stDueDate : '';
                var stPORefNum = arrInvoices[i].getValue('custrecord_ci_po_ids');
                    stPORefNum = (stPORefNum) ? stPORefNum : '';
                var stCustBillAddr = null; 
                //nlapiLogExecution('DEBUG','InLoop:arrInvoices','stTerms=' + stTerms + ' stDueDate=' + stDueDate + ' stPORefNum=' + stPORefNum);
                
                for(var x=1; x<=arrRelInvoices.length; x++)
                {
                    var stInvoiceId = arrRelInvoices[x-1];
                    var recInvoice  = nlapiLoadRecord('invoice',stInvoiceId);
                    var isSuppressed = recInvoice.getFieldValue('custbody_suppressed_invoice');
                    
                    if(!stCustBillAddr)
                    {
                        stCustBillAddr = getBillToAddressFromInvoice(recInvoice);
                        stCustBillAddr = setAddressMargin(stCustBillAddr);
                    }
                    
                    var refno       = nlapiEscapeXML(recInvoice.getFieldValue('tranid'));
                    var lineCount   = recInvoice.getLineItemCount('item');
                    var subtotal    = recInvoice.getFieldValue('subtotal');
                        subtotal    = (subtotal) ? parseFloat(subtotal) : 0.00;
                    var taxtotal    = recInvoice.getFieldValue('taxtotal');
                        taxtotal    = (taxtotal) ? parseFloat(taxtotal) : 0.00;                        
                    //nlapiLogExecution('DEBUG','In Loop: arrRelInvoices','stInvoiceId=' + stInvoiceId + ' refno=' + refno + ' lineCount=' + lineCount);
                    
                    //push invoices total per consolidated invoice
                    grandtotal += subtotal;
                    grandtaxtotal += taxtotal;
                    
                    arrAllInvLines = getLinesFromInvType(arrAllInvLines,recInvoice,refno,isSuppressed)                    
                }
                
                //totals
                var arrShiptoTotalDetails = [grandtotal,grandtaxtotal];
                var htmlTotalDetails      = buildTotals(arrShiptoTotalDetails);
                var flInvTotal            = grandtotal + grandtaxtotal;
                    flInvTotal            = formatCurrency(flInvTotal, 2)
                
                //build the content table                
                var htmlCIHeader = buildHeaderRowPerAddress();
                var htmlCIBody   = buildRowPerAddress(arrAllInvLines);
                
                var arrHTMLBulkPrintContent = [];
                	arrHTMLBulkPrintContent = arrHTMLBulkPrintContent.concat(['<body size="letter" header="ci_header" header-height="320px" footer="ci_footer" footer-height="40px">'].join(''));            	        		                        
                    arrHTMLBulkPrintContent = arrHTMLBulkPrintContent.concat(['<table class="full" border="1" border-top="0" table-layout="fixed">'].join(''));
                    arrHTMLBulkPrintContent = arrHTMLBulkPrintContent.concat(['<thead>'].join(''));
                    arrHTMLBulkPrintContent = arrHTMLBulkPrintContent.concat([htmlCIHeader].join(''));
                    arrHTMLBulkPrintContent = arrHTMLBulkPrintContent.concat(['</thead>'].join(''));
                    arrHTMLBulkPrintContent = arrHTMLBulkPrintContent.concat(['<tbody>'].join(''));
            		arrHTMLBulkPrintContent = arrHTMLBulkPrintContent.concat([htmlCIBody].join(''));
                    arrHTMLBulkPrintContent = arrHTMLBulkPrintContent.concat([htmlTotalDetails].join(''));
                    arrHTMLBulkPrintContent = arrHTMLBulkPrintContent.concat(['</tbody>'].join(''));              
                    arrHTMLBulkPrintContent = arrHTMLBulkPrintContent.concat(['</table>'].join(''));
                    arrHTMLBulkPrintContent = arrHTMLBulkPrintContent.concat(['<pbr size="letter" header="remittance_slip_header" header-height="316px"/>'].join(''));
                    arrHTMLBulkPrintContent = arrHTMLBulkPrintContent.concat(['</body>'].join(''));
                
                var htmllines = arrHTMLBulkPrintContent.join('');                
                nlapiLogExecution('DEBUG','Item Content','htmllines=' + htmllines);
                
                //start substituting the values to the main template                
                var stMainHTML = objFile.getValue();
                
                stMainHTML = substitute(stMainHTML,'{NLMAINLOGO}',nlapiEscapeXML(stURLLogo));
                stMainHTML = substitute(stMainHTML,'{NLSUBSIDIARYNAME}',nlapiEscapeXML(stCompName));
                stMainHTML = substitute(stMainHTML,'{NLSUBRETADDRS}',stAdrHeader);
                //stMainHTML = substitute(stMainHTML,'{NLADDRFOOTER}',stAddress);
				stMainHTML = substitute(stMainHTML,'{NLREMIADDR}', nlapiGetContext().getSetting('SCRIPT', 'custscript_tw_check_payment_address').replace(/{br}/g, '<br/>'));
                stMainHTML = substitute(stMainHTML,'{NLPHONE}',nlapiEscapeXML(stPhoneNo));
                stMainHTML = substitute(stMainHTML,'{NLINVOICENO}',nlapiEscapeXML(stCITranId));
                stMainHTML = substitute(stMainHTML,'{NLCUSTOMER}',nlapiEscapeXML(stCICustomerText));
                //stMainHTML = substitute(stMainHTML,'{NLDATE}',parseDateOnly(stCICreateDate));//commented 8/22 - wbermudo
				stMainHTML = substitute(stMainHTML,'{NLDATE}',stCIInvoiceDate);//added 8/22 - wbermudo
                stMainHTML = substitute(stMainHTML,'{NLGRANDTOTAL}',flInvTotal);
                stMainHTML = substitute(stMainHTML,'{NLSHIPTO}',stCustShipAddr);
                stMainHTML = substitute(stMainHTML,'{NLBILLTO}',stCustBillAddr);
                stMainHTML = substitute(stMainHTML,'{NLEMAIL}',nlapiEscapeXML(stEmail));
                stMainHTML = substitute(stMainHTML,'{NLTAXID}',nlapiEscapeXML(stTaxNo));
                stMainHTML = substitute(stMainHTML,'{NLTERMS}',stTerms);
                stMainHTML = substitute(stMainHTML,'{NLDUEDATE}',stDueDate);
                stMainHTML = substitute(stMainHTML,'{NLPONUM}',stPORefNum);
                stMainHTML = substitute(stMainHTML,'{NLFAX}',nlapiEscapeXML(stFaxNo));
                stMainHTML = substitute(stMainHTML,'{NLINVOICENOFT}',nlapiEscapeXML(stCITranId));
                stMainHTML = substitute(stMainHTML,'{NLINVAMOUNTFT}',flInvTotal);
                stMainHTML = substitute(stMainHTML,'{NLBILLTOFT}',stCustBillAddr);
                stMainHTML = substitute(stMainHTML,'{NLSUBSIDIARYCOYNAME}',stAddress);
                stMainHTML = substitute(stMainHTML,'{NLDETAILLINE}',htmllines);
                nlapiLogExecution('DEBUG','HTML','stMainHTML=' + stMainHTML);
                
                try
                {
                    nlapiLogExecution('DEBUG','Start Converting to PDF','---Start---');
                    var filePDF = nlapiXMLToPDF(stMainHTML);
                        filePDF.setName(stCICustomerText + '_' + getDateToday() + '_' + stCITranId + '.pdf');
                        filePDF.setFolder(stFolder);
                    
                    var fileId = nlapiSubmitFile(filePDF);
                    nlapiLogExecution('DEBUG','End Converting to PDF','---End : fileId=' + fileId + '---');
                    
                    //associate the newly created pdf on the ci custom record
                    nlapiSubmitField('customrecord_consolidated_invoice',stCIID,'custrecord_ci_pdf',fileId);
                    
                    //send email if paperless else, attach the pdf in the customer record
                    if(stCustPaperless=='T')
                    {
                        if(!stCustEmail)
                        {
                            nlapiLogExecution('ERROR','Email not sent','Customer:' + stCICustomerText + ' has no email address. PDF file is attached in the customer record.');
                        }
                        else
                        {
                            var mail = nlapiMergeRecord(stEmailTemplate,'customer',stCICustomer);
                            nlapiSendEmail(stSender, stCustEmail, stSubject, mail.getValue(), null, null, null, filePDF);
                        }
                    }
					
                    nlapiAttachRecord('file',fileId,'customer',stCICustomer);
                }
                catch(e)
                {
                    nlapiLogExecution('ERROR','PDF Error', 'Error Occurred for Consolidated Invoice ID:' + stCIID);
                    nlapiLogExecution('ERROR','PDF Error', 'Error Details:' + e.toString());
                    nlapiLogExecution('ERROR','PDF Error', 'Skip processing Consolidate Invoice ID:' + stCIID);
                }
            }
            else
            {
                nlapiLogExecution('DEBUG','No Invoices','There is/are no invoice/s selected on consolidated invoice:' + stCIID);
            }
            //nlapiLogExecution('DEBUG','Consolidated Invoice PDF','***Finished Processing Consolidated Invoice ID:' + stCIID + '***');
        }
        //nlapiLogExecution('DEBUG','Scheduled Script: Consolidated Invoice PDF','|----------FINISHED----------|');
    }
    catch(error)
    {
        if (error.getDetails != undefined)
        {
            nlapiLogExecution('ERROR','Process Error', error.getCode() + ': ' + error.getDetails());
            throw error;
        }
        else
        {
            nlapiLogExecution('ERROR','Unexpected Error', error.toString());
            throw nlapiCreateError('99999', error.toString());
        }
    }
}


function getLinesFromInvType(arrAllInvLines,recInvoice,refno,suppress)
{
    var lineCount = recInvoice.getLineItemCount('item');
    
    if(suppress == 'F')
	{
		for(var y=1; y<=lineCount; y++)
        {
            var item = nlapiEscapeXML(recInvoice.getLineItemText('item','item',y)); 
			var desc = nlapiEscapeXML(recInvoice.getLineItemValue('item','description',y));			
            var qty  = nlapiEscapeXML(recInvoice.getLineItemValue('item','custcol_crm_quantity',y));
            var rate = nlapiEscapeXML(recInvoice.getLineItemValue('item','rate',y));
            var amt  = nlapiEscapeXML(recInvoice.getLineItemValue('item','amount',y));
            //nlapiLogExecution('DEBUG','In Loop: arrRelInvoices','item=' + item + ' desc=' + desc + ' qty=' + qty + ' rate=' + rate + ' amt=' + amt);
            
            arrAllInvLines.push([refno,item,desc,qty,rate,amt]);
        }
	}
	else
	{
        for(var y=1; y<=lineCount; y++)
        {
            var item   = nlapiEscapeXML(recInvoice.getLineItemText('item','item',y));
			var stDesc = recInvoice.getLineItemValue('item','description',y);
			var stAmt  = recInvoice.getLineItemValue('item','custcol_invoice_aggregated_amount',y);
			var stQty  = recInvoice.getLineItemValue('item','custcol_suppress_items',y);
			
			//if(!stDesc || !stAmt || !stQty)
			//{
			//	nlapiLogExecution('DEBUG','Suppress Item:' + item + ' is not displayed in the PDF' ,'Either description, Aggregated Amount or CRM Quantity is missing');
			//	continue;
			//}
			//stAmt = isEmpty(stAmt) ? 0.00 : stAmt;
			//stQty = isEmpty(stQty) ? 0 : stQty;
			var desc = nlapiEscapeXML(stDesc);
            var amt  = stAmt;
			var qty  = stQty;
            var rate = nlapiEscapeXML(recInvoice.getLineItemValue('item','rate',y));            
            //nlapiLogExecution('DEBUG','In Loop: arrRelInvoices','item=' + item + ' desc=' + desc + ' qty=' + qty + ' rate=' + rate + ' amt=' + amt);
            
            arrAllInvLines.push([refno,item,desc,qty,rate,amt]);
        }
	}
    
    return arrAllInvLines;
}


function getBillToAddressFromInvoice(rec)
{
    var stBillAddr = rec.getFieldValue('billaddress');
    
    return stBillAddr;
}



function collectInvoice(arrInvDetails)
{
    var arrInvIDs    = [];
    var arrInvPOs    = [];
    var arrInvDueDt  = [];
    var arrInvTerms  = [];
    var objCIDueDate = '';
    var stCIDueDate  = '';
    var stCITerms    = '';
    var stCITranDate = '';
    
    for(var z=0; arrInvDetails && z<arrInvDetails.length; z++)
    {
        var invid    = arrInvDetails[z][0];
        var invpo    = arrInvDetails[z][1];
        var duedate  = arrInvDetails[z][2];
        var terms    = arrInvDetails[z][3];
		var trandate = arrInvDetails[z][4];//added 8/22 - wbermudo
		
        //nlapiLogExecution('DEBUG','collectInvoice:InLoop:arrInvDetails','invid=' + invid + ' invpo=' + invpo + ' duedate=' + duedate + ' terms=' + terms + ' trandate='+trandate);
        
        arrInvIDs.push(invid);
		
		if (!isEmpty(invpo))
		{
			if (!inArray(invpo, arrInvPOs))
			{
				arrInvPOs.push(invpo);
			}
		}
        
        if(duedate && duedate!='')
        {
			var arrInvFld = [];
			arrInvFld.duedate  = duedate;
			arrInvFld.trandate = trandate;
			arrInvFld.terms    = terms;
			arrInvFld.mstime   = nlapiStringToDate(trandate).getTime();
            //arrInvDueDt.push([duedate,terms,trandate, nlapiStringToDate(trandate).getTime()]);
			arrInvDueDt.push(arrInvFld);
        }
    }
    
    if(arrInvDueDt.length>0)
    {
        //arrInvDueDt  = arrInvDueDt.sort(sortStyleb);
		arrInvDueDt  = sortArray(arrInvDueDt);
        objCIDueDate = arrInvDueDt[0].duedate;
        stCITerms    = arrInvDueDt[0].terms;
        stCITerms    = (stCITerms) ? stCITerms : '';
		stCITranDate = arrInvDueDt[0].trandate;
		stCITranDate = (stCITranDate) ? stCITranDate : '';
        //objCIDueDate = getDueDateOnTerms(objCIDueDate,stCITerms);
		objCIDueDate = getDueDateOnTerms(nlapiStringToDate(stCITranDate),stCITerms);//added 8/22 - wbermudo
        stCIDueDate  = nlapiDateToString(objCIDueDate);
    }
    nlapiLogExecution('DEBUG','collectInvoice','arrInvIDs=' + arrInvIDs.join(',') + ' arrInvPOs=' + arrInvPOs.join(',') + ' stCIDueDate=' + stCIDueDate + ' stCITerms=' + stCITerms)
    
    return [arrInvIDs,arrInvPOs,stCIDueDate,stCITerms,stCITranDate];
}


function sortStyle(a,b) 
{		
   if (a[0]<b[0]) return -1;
   if (a[0]>b[0]) return 1;
   return 0;
}

function sortStyleb(a,b) 
{		
   if (a[2]<b[2]) return -1;
   if (a[2]>b[2]) return 1;
   return 0;
}

function sortArray(obj)
{
    var len = numRows(obj);
    
    var x, y, objHolder; 
    for (x = 0; x < len; x++)
    {
        var bSwapOccured = false;
        for (y = 0; y < (len-1); y++)
        {
            if (obj[y].mstime > obj[y+1].mstime)
            {
                objHolder = obj[y+1]; 
                obj[y+1]  = obj[y]; 
                obj[y]    = objHolder; 
                
                bSwapOccured = true;
            } 
        }
      
        if (!bSwapOccured)
        {
            break;
        }
    }
    
    return obj; 
}

function isEmpty(str) {
    return (!str || 0 === str.length);
}

function numRows(obj)
{
    var ctr = 0;
    for (var k in obj) {
        if (obj.hasOwnProperty(k)) {
            ctr++;
        }
    }
    return ctr;
}

function getDueDateOnTerms(duedate,terms)
{
    var NET_15   = 1;    
    var NET_30   = 2;
    var NET_45   = 7;
    var NET_60   = 3;
    var NET_1_30 = 5;
    var NET_2_30 = 6;
    var DAYS = 0;
    
    if(terms == NET_15)
    {
        DAYS = 15;
    }
    else if(terms == NET_30)
    {
        DAYS = 30;
    }
    else if(terms == NET_45)
    {
        DAYS = 45;
    } 
    else if(terms == NET_60)
    {
        DAYS = 60;
    } 
    else if(terms == NET_1_30)
    {
        DAYS = 30;
    } 
    else if(terms == NET_2_30)
    {
        DAYS = 30;
    }
    
    var objDate = nlapiAddDays(duedate,DAYS);
    
    return objDate;
}



function substitute(html,tag,value)
{   
    if(!value)
    {
        value = '';
    }
    
    var main = html.replace(new RegExp(tag,'g'),value);
    
    return main;
}




function buildHeaderRowPerAddress()
{
    var arrHead = '<tr>';
        arrHead +=		'<td class="header" border-top="0pt" border-right="0pt" border-left="0pt" width="20%" align="center">REF NO</td>';					
        //arrHead +=		'<td class="header" border-top="0pt" border-right="0pt" width="20%" align="center">ITEM</td>';
        arrHead +=		'<td class="header" border-top="0pt" border-right="0pt" width="40%" align="center">DESCRIPTION</td>';
        //arrHead +=		'<td class="header" border-top="0pt" border-right="0pt" width="20%" align="center">MEMO</td>';
        arrHead +=      '<td class="header" border-top="0pt" border-right="0pt" width="20%" align="center">QTY</td>';
        //arrHead +=		'<td class="header" border-top="0pt" border-right="0pt" width="15%" align="center">UNIT PRICE</td>';
        arrHead +=		'<td class="header" border-top="0pt" border-right="0pt" width="20%" align="center">AMOUNT</td>';
        arrHead += '</tr>';   
        
    return arrHead;
}


function buildRowPerAddress(arrRowContent)
{
    var arrRow = '';
    
    for(var i=0; arrRowContent && i<arrRowContent.length; i++)
    {
        var stRefno = arrRowContent[i][0];
        var stItem  = arrRowContent[i][1];
        var stDesc  = arrRowContent[i][2];
            stDesc  = (stDesc) ? stDesc : '';
        var fQty    = arrRowContent[i][3];
            fQty    = (fQty) ? (parseFloat(arrRowContent[i][3])).toFixed(2) : '&#160;';                        
        var fRate   = (arrRowContent[i][4]) ? formatCurrency(arrRowContent[i][4],2) : '&#160;';
        var fAmount = arrRowContent[i][5];
            fAmount = (fAmount) ? formatCurrency(fAmount,2) : '&#160;';
            
        arrRow +='<tr>'
		arrRow +=	'<td class="itemline" width="20%" align="center"> ' + stRefno + '&#160;&#160;</td>';
		//arrRow +=	'<td class="itemline" width="20%" align="left">  ' + stItem  + '&#160;&#160;</td>';
		arrRow +=	'<td class="itemline" width="40%" align="left">  ' + stDesc  + '&#160;&#160;</td>';
        //arrRow +=	'<td class="itemline" width="20%" align="left"> &#160;&#160;</td>';
		arrRow +=	'<td class="itemline" width="20%"  align="right"> ' + fQty    + '&#160;&#160;</td>';
		//arrRow +=	'<td class="itemline" width="15%" align="right"> ' + fRate   + '&#160;&#160;</td>';
		arrRow +=	'<td class="itemline" width="20%" align="right"> ' + fAmount + '&#160;&#160;</td>';
		arrRow +='</tr>';
    }
        
    return arrRow;
}


function buildTotals(arrShiptoTotalDetails)
{    
    var flInvSubTotal = arrShiptoTotalDetails[0];    
    var flTaxTotal    = arrShiptoTotalDetails[1];   
    var flInvTotal    = flInvSubTotal + flTaxTotal;
    
    var arrGrandTotal = ['<tr>',
                				'<td class="itemline" colspan="7" border-top="0pt" border-right="0pt" border-left="0pt" width="18%" align="center">&#160;</td>',                			            				
                			'</tr>',
                            '<tr>',
        						'<td class="itemline" colspan="1" width="20%">&#160;</td>',        						
        						'<td class="itemline" colspan="2" width="50%" align="right" white-space="nowrap">SUB TOTAL:</td>',
        						'<td class="itemline" width="10%" align="right" white-space="nowrap">', formatCurrency(flInvSubTotal, 2), '&#160;</td>',
        				    '</tr>',                           
                            '<tr>',
        						'<td class="itemline" colspan="1" width="20%">&#160;</td>',        						
        						'<td class="itemline" colspan="2" width="50%" align="right" white-space="nowrap">TAX TOTAL:</td>',
        						'<td class="itemline" width="10%" align="right" white-space="nowrap">', formatCurrency(flTaxTotal, 2), '&#160;</td>',
        				    '</tr>',
                            '<tr>',
        						'<td class="itemline" colspan="1" width="20%">&#160;</td>',        					
        						'<td class="itemline" colspan="2" width="50%" align="right" white-space="nowrap">INVOICE TOTAL:</td>',
        						'<td class="itemline" width="10%" align="right" white-space="nowrap">', formatCurrency(flInvTotal, 2), '&#160;</td>',
        				    '</tr>'];    
    return arrGrandTotal.join('');
}


function buildEmptyRow()
{   
	return ['<tr>',
				'<td class="itemline" border-top="0pt" border-right="0pt" border-left="0pt" width="18%" align="center">&#160;</td>',
				'<td class="itemline" border-top="0pt" border-right="0pt" width="8%" align="center">&#160;&#160;</td>',
				'<td class="itemline" border-top="0pt" border-right="0pt" width="20%" align="center">&#160;&#160;</td>',
				'<td class="itemline" border-top="0pt" border-right="0pt" width="32%" align="center">&#160;&#160;</td>',
				'<td class="itemline" border-top="0pt" border-right="0pt" width="11%" align="center">&#160;&#160;</td>',
				'<td class="itemline" border-top="0pt" border-right="0pt" width="11%" align="center">&#160;&#160;</td>',
			'</tr>'].join('');
}


function associateCIToInvoice(stConsInvId,arrInvoices)
{
    for(var i=0; arrInvoices && i<arrInvoices.length; i++)
    {
        nlapiSubmitField('invoice',arrInvoices[i],'custbody_ci_record_ref',stConsInvId);
    }
}


function getAllCustomers(startdate,enddate)
{
    var arrCIFilter = [new nlobjSearchFilter('trandate',null,'within',startdate,enddate)];
    var arrCIResult = nlapiSearchRecord('invoice','customsearch_consolidated_inv_search',arrCIFilter);
    
    return arrCIResult;
}


function getAllCIInvoicesForConsolidation(stIds)
{   
    var arrIds = stIds.split(',');
    
    var col = [new nlobjSearchColumn('name'),
               new nlobjSearchColumn('custrecord_ci_customer'),
               new nlobjSearchColumn('custrecord_ci_svc_start_date'),
               new nlobjSearchColumn('custrecord_ci_svc_end_date'),
               new nlobjSearchColumn('custrecord_ci_related_invoices'),
               new nlobjSearchColumn('custrecord_ci_pdf'),
               new nlobjSearchColumn('custrecord_ci_tran_currency'),
               new nlobjSearchColumn('custrecord_ci_ship_to_address'),               
               new nlobjSearchColumn('custrecord_ci_terms'),
               new nlobjSearchColumn('custrecord_ci_due_date'),
               new nlobjSearchColumn('custrecord_ci_po_ids'),
			   new nlobjSearchColumn('custrecord_ci_invoice_date'),
               new nlobjSearchColumn('created'),
               new nlobjSearchColumn('billaddress','CUSTRECORD_CI_CUSTOMER'),                        
               new nlobjSearchColumn('shipaddress','CUSTRECORD_CI_CUSTOMER'),
               new nlobjSearchColumn('email','CUSTRECORD_CI_CUSTOMER'),
               new nlobjSearchColumn('custentity_ci_paperless','CUSTRECORD_CI_CUSTOMER')];
    var fil = [new nlobjSearchFilter('custrecord_ci_pdf',null,'anyof','@NONE@'),
               new nlobjSearchFilter('isinactive',null,'is','F'),
               new nlobjSearchFilter('internalid',null,'anyof',arrIds)];
    var res = nlapiSearchRecord('customrecord_consolidated_invoice',null,fil,col);
    
    return res;
}


function getInvoiceCurrencies(customer,startdate,enddate)
{   
    var arrInvoiceFilter = [new nlobjSearchFilter('trandate',null,'within',startdate,enddate),
                            new nlobjSearchFilter('internalid','customer','anyof',customer)];
    var arrInvoiceResult = nlapiSearchRecord('invoice','customsearch_consolidated_inv_search_2',arrInvoiceFilter);
    
    return arrInvoiceResult;
}


function getAllCustomersInvoices(customer,invtype,startdate,enddate)
{
    if(!invtype || invtype=='null')
    {
        invtype = '@NONE@';
    }
    
    var arrInvoiceFilter = [new nlobjSearchFilter('trandate',null,'within',startdate,enddate),
                            new nlobjSearchFilter('internalid','customer','anyof',customer),
                            new nlobjSearchFilter('custbody_ci_category',null,'anyof',invtype)];
    var arrInvoiceResult = nlapiSearchRecord('invoice','customsearch_customer_inv_search',arrInvoiceFilter);
    
    return arrInvoiceResult;
}



function getAllCustomerShipAddress(customer,startdate,enddate)
{
    var arrInvoiceFilter = [new nlobjSearchFilter('trandate',null,'within',startdate,enddate),
                            new nlobjSearchFilter('internalid','customer','anyof',customer)];
    var arrInvoiceResult = nlapiSearchRecord('invoice','customsearch_customer_inv_search_2',arrInvoiceFilter);
    
    return arrInvoiceResult;
}


function getDateToday()
{
    var date = new Date();
    var month = parseInt(date.getMonth()) + 1;
    var day = date.getDate();
    var year = date.getFullYear();
    
    if(parseInt(month) < 10)
    {
        month = '0' + month;
    }
    
    if(parseInt(day) < 10)
    {
        day = '0' + day;
    }
    
    var formattedDate = month + '/' + day + '/' + year;
    
    return formattedDate;
}


function setAddressMargin(stShipToAddr,record,type)
{
    if(type=='header')
    {
		var stPhone = record.getFieldValue('phone');
		var stFax	= record.getFieldValue('fax');
        var stTaxId = record.getFieldValue('taxid');
        var stTaxTxt = 'Trustwave Tax ID#: ';
        var stEmail = record.getFieldValue('email');
        stShipToAddr += '\n';
        stShipToAddr += stPhone  + '\n\n';
        stShipToAddr += stTaxTxt + stTaxId +'\n';
        stShipToAddr += 'Email: ' + nlapiLookupField('employee', nlapiGetContext().getSetting('SCRIPT', 'custscript_tw_email_sender'), 'email') + '\n';
		stShipToAddr += 'Fax CC Payment Info to: '+stFax;
    }
    
    var stDfaultBillAddrs = nlapiEscapeXML(stShipToAddr);
    
    if(stDfaultBillAddrs== '' || !stDfaultBillAddrs)
    {
        return '';
    }
    
	var stHeaderHeight		= "285pt";
	var arrDefaultAddr 	    = stDfaultBillAddrs.split(/\r|\n|\r\n/gi);
    var arrDefaultAddrCount = arrDefaultAddr.length;    
    
	switch (arrDefaultAddrCount)
	{
		case 2: 
			stDfaultBillAddrs += '<br/><br/><br/><br/>';
		break;
        
		case 3: 
			stDfaultBillAddrs += '<br/><br/><br/>';
		break;
		
		case 4:
			stDfaultBillAddrs += '<br/><br/>';
		break;
        
        case 5:
            stDfaultBillAddrs += '<br/>';
        break;
        
		case 6:
            stDfaultBillAddrs += '';
		break;
	}
    
    stDfaultBillAddrs = setAddressLine(stDfaultBillAddrs, true);
    
    return stDfaultBillAddrs;
}


function truncateString(str, bBillTo)
{
    var MAX_CHAR = bBillTo === true ? 50 : 46;
    //nlapiLogExecution('AUDIT', 'truncateString', 'Max Char:'+MAX_CHAR);
    
    var arrStr = str.split(/\\s+/g);
    if (!arrStr)
    {
        return '';
    }
    //nlapiLogExecution('AUDIT', 'truncateString', 'arrStr.length:'+arrStr.length);
    
    var stLineStr = arrStr[0];
    var arrLineStr = stLineStr.split(/\s|\,/g);
    
    if (!arrLineStr)
    {
        return '';
    }
    //nlapiLogExecution('AUDIT', 'truncateString', 'arrLineStr.length:'+arrLineStr.length);
    
    var newStr      = [];
    var charCount   = 0;
    for (var t = 0; arrLineStr != null && t < arrLineStr.length; t++)
    {
        charCount += arrLineStr[t].length;
        //nlapiLogExecution('AUDIT', 'truncateString', 'String:'+arrLineStr[t]+'Length:'+arrLineStr[t].length);
        
        if (charCount <= MAX_CHAR)
        {
            newStr.push(arrLineStr[t] + ' ');
            charCount++;
        }
        else
        {
            return newStr.join('').replace(/^\s*|\s*$/g,"");
        }
    }

    return newStr.join('').replace(/^\s*|\s*$/g,"");;
}


function setAddressLine(stAddress, bBillTo)
{
    var stParsedAddrs = '';
    if (stAddress != null) 
    {
        var arrBillAddrs = stAddress.split('\n');
        for (x in arrBillAddrs) 
        {
            stParsedAddrs += truncateString(arrBillAddrs[x], true) + '<br/>';
        }
    }
    
    return stParsedAddrs;
}


function formatCurrency(stAmount,decimalCount) 
{
  decimalCount = (decimalCount) ? decimalCount : 2;    
  var fAmount = (stAmount) ? parseFloat(stAmount) : 0.00; 
      fAmount = fAmount.toFixed(decimalCount); 
  
  var stAmount = fAmount;
  var arrAmount = stAmount.split('.'); 
  var stDigits = arrAmount[0]; 
  var arrDigits = stDigits.split(''); 
  var stFormatDigits = ''; 
  var ctr = 0;      
  
  if(arrDigits.length > 3) 
  {         
     for(var i=arrDigits.length; i>=1 ; i--) 
     {
          if(ctr%3==0 && ctr!=0) 
          {
              stFormatDigits = ',' + stFormatDigits; 
          }
          
          stFormatDigits = arrDigits[i-1] + stFormatDigits;
          ctr ++;
      } 
      stAmount = stFormatDigits + '.' + arrAmount[1]; 
  }
  
  return stAmount ; 
}


function formatCIDate(dteCI)
{
    var objDate = nlapiStringToDate(dteCI);
    var stYear = objDate.getFullYear().toString();
    var stMM = objDate.getMonth() + 1;
    var stDD = objDate.getDate();
    var stYY = stYear.substr(2);
    
    if (stMM < 10) 
    {
        stMM = '0' + stMM;
    }
    
    if (stDD < 10) 
    {
        stDD = '0' + stDD;
    }
    
    return stMM + '-' + stDD + '-' + stYY;
}


function parseDateOnly(stDate)
{
    var arrDate = stDate.split(' ');       
    return formatCIDate(arrDate[0]);        
}

function inArray(val, arr)
{
    var bIsValueFound = false;
    for(var i = 0; i < arr.length; i++)
    {
        if(val == arr[i])
        {
            bIsValueFound = true;
            break;
        }
    }
    return bIsValueFound;
}

function getInvoiceIds(arr)
{
    var arrInvoices = [];
    for(var i=0; arr && i<arr.length; i++)
    {
        var stInvId = arr[i].getId();
        arrInvoices.push(stInvId);
    }
    
    return arrInvoices;
}


function redirectPage(form,url)
{	
	var scriptFld = form.addField("scripttxt", "inlinehtml");
	scriptFld.setDefaultValue(
		"<script language='javascript'>" +
		"window.location='"+url+"';" +
        "window.ischanged = false;" +	        
		"</script>"
	);
}