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
 */
var LOG = {_DEBUG : nlapiGetContext().getLogLevel()};
/**
 * The purpose of this script is <changme>
 *
 * @param (string) <varname> <desc>
 * @return <desc>
 * @type string
 * @author William F. Bermudo
 * @version 1.0
 */
function beforeSubmit_UpdateTransactionCurrency(type)
{
    var funcTitle = 'beforeSubmit_UpdateTransactionCurrency';
    nlapiLogExecution(LOG._DEBUG, funcTitle, '===================== START =====================, type='+type);
    
    var stExecContext = nlapiGetContext().getExecutionContext();
    nlapiLogExecution(LOG._DEBUG, funcTitle, 'Execution Context='+stExecContext);
    
    //if (stExecContext != 'webservices' && stExecContext != 'userinterface')
    if (stExecContext != 'webservices')
    {
        return;
    }
    
    if (type != 'create')
    {
        return;
    }
    
    var thisRec = nlapiGetNewRecord();
    
    var stCustomerId = thisRec.getFieldValue('entity');
    
    var stCurrency   = thisRec.getFieldValue('custbody_update_customer_currency');
    nlapiLogExecution(LOG._DEBUG, funcTitle, 'Customer='+stCustomerId+',Currency='+stCurrency);
    
    if (isEmpty(stCurrency))
    {
        return;
    }
    
    var wasUpdated = Customer(stCustomerId, stCurrency);
    
    thisRec.setFieldValue('currency', stCurrency);
    
    for (var i = 1, iCount = thisRec.getLineItemCount('item'); i <= iCount; i++)
    {
        var stLineJobId = thisRec.getLineItemValue('item', 'job', i);
        nlapiLogExecution(LOG._DEBUG, funcTitle, '[' +i+ '] Line Job Id='+stLineJobId);
        
        if (!isEmpty(stLineJobId))
        {
            var wasUpdated = updateJobRecord(stLineJobId, stCurrency);
        }
    }
    
    nlapiLogExecution(LOG._DEBUG, funcTitle, '===================== END =======================');
}

function getRecordType(id)
{
    var columns = [];
    columns[columns.length] = new nlobjSearchColumn('type');
    
    var filters = [];
    filters[filters.length] = new nlobjSearchFilter('internalid', null, 'anyof', id);    

    var results = nlapiSearchRecord('entity', null, filters, columns);
    var type = results[0].getText('type');
    
    var recType = '';
    switch (type)
    {
        case 'Project':
            recType = 'job';
        break;
        
        case 'Customer':
            recType = 'customer';
        break;
        
        default:
            throw nlapiCreateError('9999', 'Invalid Record Type.');
        break;
    }
    
    return recType;
}

function Customer(id, currency)
{
    var funcTitle = 'Customer';
    
    var stCustomerId = id;
    var thisRec = null;
    try
    {
        thisRec = nlapiLoadRecord('customer', stCustomerId);
    }
    catch (e)
    {
        var stRecType = getRecordType(id);
        
        if (stRecType == 'job')
        {
            //Update Job Record
            var wasUpdated = updateJobRecord(id, currency);
            nlapiLogExecution(LOG._DEBUG, funcTitle, 'Job Updated?='+wasUpdated);
        }
        
        thisRec = nlapiLoadRecord('customer', stCustomerId);
    }
    
    var lineCount = thisRec.getLineItemCount('currency');
    
    var arrCustomerCurrency = [];
    for (var i = 1; i <= lineCount; i++)
    {
        arrCustomerCurrency.push(thisRec.getLineItemValue('currency', 'currency', i));
    }
    
    var wasUpdated = false;
    if (!inArray(currency, arrCustomerCurrency))
    {
        thisRec.setLineItemValue('currency', 'currency', lineCount+1, currency);
        
        var updId = nlapiSubmitRecord(thisRec, true, false);
        nlapiLogExecution(LOG._DEBUG, funcTitle, 'Updated CustomerId='+updId);
        wasUpdated = true;
    }
    
    return wasUpdated;
}

function updateJobRecord(id, txnCurrency)
{
    var funcTitle = 'updateJobRecord';
    // Update Job/Project Currency
    var thisJob = nlapiLoadRecord('job', id);
    stCustomerId = thisJob.getFieldValue('customer');
    var stJobCurrency = thisJob.getFieldValue('currency');
    
    var wasUpdated = false;
    if (stJobCurrency != txnCurrency)
    {
        thisJob.setFieldValue('currency', txnCurrency);
        var jobId = nlapiSubmitRecord(thisJob, false, true);
        nlapiLogExecution(LOG._DEBUG, funcTitle, 'Successfully Updated Job='+jobId);
        wasUpdated = true;
    }
    
    return wasUpdated;
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