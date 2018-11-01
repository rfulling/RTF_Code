var LOG = {_DEBUG:'DEBUG'};
function scheduled_updateJournalEntry(type)
{
    var funcTitle = 'scheduled_updateJournalEntry';
    nlapiLogExecution(LOG._DEBUG, funcTitle, '=================== ENTRY LOG ===================');
    
    var USAGE_LIMIT_THRESHOLD = 500;
    
    var isProcessed = nlapiGetContext().getSetting('SCRIPT', 'custscript_param_processed_ids');
    nlapiLogExecution(LOG._DEBUG, funcTitle, 'isProcessed='+isProcessed);
    
    var filters = null;
    var arrProcessed = [];
    if (!isEmpty(isProcessed))
    {
        arrProcessed = isProcessed.split(',');
        
        filters = [];
        filters.push(new nlobjSearchFilter('internalid', null, 'noneof', arrProcessed));
    }
    
    var results = nlapiSearchRecord('transaction', 'customsearch_journal_entry_dept_update', filters);
    
    if (results)
    {
        for (var i = 0, max = results.length; i < max; i++)
        {
            var REMAINING_USAGE = parseInt(nlapiGetContext().getRemainingUsage());
            nlapiLogExecution(LOG._DEBUG, funcTitle, 'REMAINING_USAGE='+REMAINING_USAGE);
            
            if (REMAINING_USAGE < USAGE_LIMIT_THRESHOLD)
            {
                var param = [];
                param['custscript_param_processed_ids'] = arrProcessed.join(',');
                var status = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), param);
                if (status == 'QUEUED') return;
            }
            
            var thisRec = null;
            try
            {
                var id = results[i].getValue('internalid', null, 'GROUP');
                nlapiLogExecution('DEBUG', funcTitle, 'Journal Entry Id='+id);
                
                if (inArray(id, arrProcessed)) continue;
                
                thisRec = nlapiLoadRecord('journalentry', id);
            }
            catch (e)
            {
                arrProcessed.push(id);
                (e instanceof nlobjError) ? nlapiLogExecution('DEBUG', 'System Error', e.getCode() + '<br/>' + e.getDetails()) : 
                                            nlapiLogExecution('DEBUG', 'Unexpected Error', e.toString());
                continue;
            }
            
            for (var j = 1, lineCount = thisRec.getLineItemCount('line'); j <= lineCount; j++)
            {
                var account = thisRec.getLineItemValue('line', 'account', j);
                
                var defaultDept = nlapiLookupField('account', account, 'custrecorddepartment_default');
                nlapiLogExecution(LOG._DEBUG, funcTitle, 'Default Department='+defaultDept);
                
                if (!isEmpty(defaultDept))
                {
                    thisRec.setLineItemValue('line', 'department', j, defaultDept);
                }
            }
            
            try
            {
                var updId = nlapiSubmitRecord(thisRec, false, true);
                nlapiLogExecution(LOG._DEBUG, funcTitle, 'Journal Entry Id='+updId+' - Successfully Updated');
                
                if (updId)
                {
                    arrProcessed.push(updId);
                }
            }
            catch (e)
            {
                arrProcessed.push(id);
                (e instanceof nlobjError) ? nlapiLogExecution('DEBUG', 'System Error', e.getCode() + '<br/>' + e.getDetails()) : 
                                            nlapiLogExecution('DEBUG', 'Unexpected Error', e.toString());
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