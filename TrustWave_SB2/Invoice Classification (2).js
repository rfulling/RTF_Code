/**
 * Module Description
 * Umesh Pokhrel
 * 2017-06-07
 * This script updates customer invoice classification using a custom record 
 *
 */

function scheduled(type) {

	nlapiLogExecution('DEBUG', 'Sending Invoice Classification');

	var filters = new Array();
	var columns = new Array();
	//filters
	filters[0] = new nlobjSearchFilter('custrecord_invoice_cl_inv_num', null, 'isnotempty', null);
	filters[1] = new nlobjSearchFilter('custrecord_invoice_cl_inv_int_id', null, 'isnotempty', null);
	filters[2] = new nlobjSearchFilter('custrecord_invoice_cl_classification', null, 'isnotempty', null);
	//columns
	columns[0] = new nlobjSearchColumn('custrecord_invoice_cl_inv_int_id');	
	columns[1] = new nlobjSearchColumn('custrecord_invoice_cl_inv_num');	
	columns[2] = new nlobjSearchColumn('custrecord_invoice_cl_classification');	
	columns[3] = new nlobjSearchColumn('internalid');	
	// perform search
	var results = nlapiSearchRecord('customrecord_invoices_classification', null, filters, columns);
	//if no results
	if (!results)
				{
					nlapiLogExecution('DEBUG', 'No Invoices to Be Updated');	
				}
	//if results
	if (results) {
		nlapiLogExecution('AUDIT', 'Processing ' + results.length
				+ ' Invoices Classification');
		//loop for number of invoices to be processed	
		for (var k = 0; k < results.length; k++)
			{
				//Customer Name of the Invoice from the Custom Record
				internalId = results[k].getValue('custrecord_invoice_cl_inv_int_id');		
				//Invoice Number in the Custom Record									
				invNum = results[k].getValue('custrecord_invoice_cl_inv_num');				
				//Classification in the Custom Record
				classification = results[k].getValue('custrecord_invoice_cl_classification');				
				//Internal Id of the Custom Record
				custrecordid = results[k].getValue('internalid');	
				
				nlapiLogExecution("DEBUG","Customer Billing Id",internalId);
				nlapiLogExecution("DEBUG","invNum",invNum);
				nlapiLogExecution("DEBUG","classification",classification);
				
				//Using the Parameters from above, create a Transaction Scripted Search for Customer Invoice
				var filter = new Array();
				var column = new Array();
				//filters
				filter[0] = new nlobjSearchFilter('type', null, 'is', 'CustInvc');
				filter[1] = new nlobjSearchFilter('mainline', null, 'is', 'T');
				filter[2] = new nlobjSearchFilter('transactionnumber', null, 'is', invNum);				
				//filter[3] = new nlobjSearchFilter('internalid', 'customermain', 'is', findVendor(internalId));
				
				//columns
				column[0] = new nlobjSearchColumn('internalid');				
				var result = nlapiSearchRecord('transaction', null, filter, column);	
				if (!result)
				{
					nlapiLogExecution('DEBUG', 'No Invoices to Be Updated');	
				}
					
				if (result) {
				for (var i = 0; i < result.length; i++)
					{					
					intID = result[i].getValue('internalid');					
					//nlapiLogExecution('DEBUG', 'Internal ID of Invoice', intID);	
					var record = nlapiLoadRecord('invoice', intID);					
					record.setFieldValue('custbody_inv_classification', classification);
					var id = nlapiSubmitRecord(record, true);											
					
					//var recordRec = nlapiLoadRecord('customrecord_invoices_classification', internalId);
					var deleteCustRecord = nlapiDeleteRecord('customrecord_invoices_classification', custrecordid);					
					}				
						
				}				
		}		
				
	}
				nlapiLogExecution('DEBUG', 'Process Complete');		
	
}

function findVendor(internalId) {
	var filter = new Array();
				var column = new Array();
				//filters
				nlapiLogExecution("DEBUG","Entity ID",internalId);
				filter[0] = new nlobjSearchFilter('entityid', null, 'is', internalId);
					
				//columns
				column[0] = new nlobjSearchColumn('internalid');				
				var result = nlapiSearchRecord('entity', null, filter, column);
				if (!result) 
				{
				nlapiLogExecution('Error', 'Error getting Vendor ID', internalId);
				return 'INVALID_VENDOR';
				}	
				else {
				internalid = result[0].getValue('internalid');
				nlapiLogExecution("DEBUG","Find Vendor Internal ID",internalid);
				return internalid;
				}
				
}
