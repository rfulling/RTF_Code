var LOG = {_DEBUG:'DEBUG'};
function scheduled_updateInvoice(type)
{
    var funcTitle = 'scheduled_updateInvoice';
    nlapiLogExecution(LOG._DEBUG, funcTitle, '=================== ENTRY LOG ===================');
    
    var USAGE_LIMIT_THRESHOLD = 500;
    
    var processedRevRecIds = nlapiGetContext().getSetting('SCRIPT', 'custscript_param_processed_revrec_ids');
    
    var arrProcessedRevRecIds = [];
    if (!isEmpty(processedRevRecIds))
    {
        arrProcessedRevRecIds = processedRevRecIds.split(',');
    }
    
    var results = nlapiSearchRecord('transaction', 'customsearch_update_revcom_department');
    
    if (results)
    {
        for (var i = 0, max = results.length; i < max; i++)
        {
            var REMAINING_USAGE = parseInt(nlapiGetContext().getRemainingUsage());
            nlapiLogExecution(LOG._DEBUG, funcTitle, 'REMAINING_USAGE='+REMAINING_USAGE);
            
            if (USAGE_LIMIT_THRESHOLD > REMAINING_USAGE)
            {
                var param = [];
                param['custscript_param_processed_revrec_ids'] = arrProcessedRevRecIds.toString();
                
                var status = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), param);
                
                if (status == 'QUEUED') return;
            }
            
            var id = results[i].getId();
            nlapiLogExecution('DEBUG', funcTitle, 'id='+id);
            
            if (inArray(id, arrProcessedRevRecIds))
            {
                continue;
            }
            
            var thisRec = null;
            try
            {
                thisRec = nlapiLoadRecord('revenuecommitment', id);
            }
            catch (e)
            {
                thisRec = nlapiLoadRecord('revenuecommitmentreversal', id);
            }
            
            for (var j = 1, lineCount = thisRec.getLineItemCount('item'); j <= lineCount; j++)
            {
                var item = thisRec.getLineItemValue('item', 'item', j);
                var itemDept = nlapiLookupField('item', item, 'department');
                nlapiLogExecution(LOG._DEBUG, funcTitle, 'Item Department='+itemDept);
                
                if (!isEmpty(itemDept))
                {
                    thisRec.setLineItemValue('item', 'department', j, itemDept);
                }
            }
            
            try
            {
                var uid = nlapiSubmitRecord(thisRec, false, true);
                nlapiLogExecution(LOG._DEBUG, funcTitle, 'Invoice Id='+uid+' - Successfully Updated');
                
                arrProcessedRevRecIds.push(id);
            }
            catch (e)
            {
                nlapiLogExecution('ERROR', funcTitle, e.getCode()+':'+e.getDetails());
            }
        }
    }
    
    nlapiLogExecution(LOG._DEBUG, funcTitle, '=================== EXIT LOG ====================');
}

function isEmpty(str)
{
    return (!str || 0 === str.length);
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