	/**
	Created by Umesh Pokhrel
	04/6/2017
	Version 1.0
	Description
	This script updates the Billable Flag to True for Exepnse Reports if the Category is Billable
	**/	
function scheduled(type) 
{
var context = nlapiGetContext();
var filters = new Array();
var columns = new Array();
//filters
filters[0] = new nlobjSearchFilter('type', null, 'is', 'ExpRept');
filters[1] = new nlobjSearchFilter('mainline', null, 'is', 'F');
filters[2] = new nlobjSearchFilter('billable', null, 'is', 'F');
filters[3] = new nlobjSearchFilter('expensecategory', null, 'anyof', [44,60,91,61,53,63,49,50,51,52,65,54,67,55,56,80,76,59,	58,	57,	48,	74,	69,	68,	45,	89,	46,	72,	70,	78,	71]);
filters[4] = new nlobjSearchFilter('custbody_coupa_er_number', null, 'isnotempty', null);
//filters[5] = new nlobjSearchFilter('internalid', null, 'anyof', ['4507394']);
//columns
columns[0] = new nlobjSearchColumn('internalid');
columns[1] = new nlobjSearchColumn('line');
var results = nlapiSearchRecord('transaction', null, filters, columns);
if (results) {			
		for (var k = 0; k < results.length; k++){			
		var LineId = '';
		var InternalID = '';
		InternalId = results[k].getValue('internalid');
		var record = nlapiLoadRecord('expensereport', InternalId);			
		LineId = results[k].getValue('line');
		nlapiLogExecution('AUDIT', 'Updating Billable Flag For Expense Report Internal ID', InternalId);
		nlapiLogExecution('AUDIT', 'Updating LineId', LineId);	
		record.setLineItemValue('expense','isbillable', LineId, 'T');		
		record.commitLineItem('expense'); 			
		nlapiSubmitRecord(record);	
		nlapiLogExecution('AUDIT', 'Updated Category For Expense Internal ID ', InternalId);
		}				
	}
}
