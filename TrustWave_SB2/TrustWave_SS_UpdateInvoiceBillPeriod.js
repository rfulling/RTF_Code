/*
 * @author William Bermudo
 * @version 1.0
 */
var LOG = {_DEBUG:'DEBUG'};
function scheduled_updateInvoiceBillPeriod(type)
{
    var funcTitle = 'scheduled_updateInvoiceBillPeriod';
    nlapiLogExecution(LOG._DEBUG, funcTitle, '=================== ENTRY LOG ===================');
    
    var USAGE_THRESHOLD = 50;
    
    var MAX_INTERNAL_ID = 0;
    var INIT            = true;
    var ARRAY_COUNT     = 1000;
    var ARR_INTERNAL_ID = [];
    
    while (ARRAY_COUNT == 1000 || INIT)
    {
        var filters = [];
        filters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));
        filters.push(new nlobjSearchFilter('type', null, 'anyof', 'CustInvc'));
        filters.push(new nlobjSearchFilter('status', null, 'anyof', 'CustInvc:A'));
        filters.push(new nlobjSearchFilter('custbody_tw_bill_period_sequence_no', null, 'isempty'));
        
        var columns = [];
        columns.push(new nlobjSearchColumn('internalid'));
        
        var results = nlapiSearchRecord('transaction', null, filters, columns);
        
        if (results == null)
        {
            return;
        }
        
        for (var i = 0, iCount = results.length; i < iCount; i++)
        {
            var id = results[i].getId();
            
            ARR_INTERNAL_ID.push(id);
        }
        
        ARRAY_COUNT     = (results.length > 0) ? results.length : 0;
        MAX_INTERNAL_ID = parseInt(results[ARRAY_COUNT - 1].getValue('internalid'));
        INIT = false;
    }
    
    var status = reloadCustomerInvoice(ARR_INTERNAL_ID);
    
    if (status == 'QUEUED')
    {
        return;
    }
    
    nlapiLogExecution(LOG._DEBUG, funcTitle, '=================== EXIT LOG ====================');
}

function reloadCustomerInvoice(arr)
{
    var USAGE_THRESHOLD = 50;
    
    nlapiLogExecution('DEBUG', 'reloadCustomerInvoice', 'Count='+arr.length);
    for (var i = 0, iCount = arr.length; i < iCount; i++)
    {
        if (parseInt(nlapiGetContext().getRemainingUsage() < USAGE_THRESHOLD))
        {
            var status = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
            
            if (status == 'QUEUED')
            {
                return;
            }
        }
        
        try
        {
            var id = arr[i];
            nlapiLogExecution('DEBUG', 'reloadCustomerInvoice', 'id='+id);
            var thisRec = nlapiLoadRecord('invoice', id);
            var uid = nlapiSubmitRecord(thisRec, false, true);
        }
        catch(e)
        {
            nlapiLogExecution('ERROR', 'SuiteScript', 'Code '+e.getCode()+':'+e.getDetails());
        }
    }
}