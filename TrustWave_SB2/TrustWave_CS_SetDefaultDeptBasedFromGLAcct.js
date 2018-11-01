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

/**
 * An automation that will automatically set the department on transaction lines and this will be driven whenever 
 * the user change/select any of the accounts on the account column field from each transaction lines.
 * 
 * @author Aurel Shenne Sinsin
 * @version 1.0
 */
function fieldChanged_setDefaultDeptBasedFrGLAcct(stType, stName)
{	
	var stLoggerTitle = 'fieldChanged_setDefaultDeptBasedFrGLAcct';
		
	nlapiLogExecution('DEBUG', stLoggerTitle, 'Entered Field Changed. Type='+stType);
    
    try
    {
    	if ((stType != 'line' || stType != 'expense') && stName != 'account')
    	{
			return true;
		}
		
		// Determine the Account Id (internalid) the user selected on the account column field
		var stAcct = nlapiGetCurrentLineItemValue(stType, 'account');
		nlapiLogExecution('DEBUG', stLoggerTitle, 'Current Line Account: ' + stAcct);
		
		if (!isEmpty(stAcct))
		{
			// Perform a lookup on the Account record and acquire the value of the Department on the record
			var stDept = nlapiLookupField('account', stAcct, 'custrecorddepartment_default');
			nlapiLogExecution('DEBUG', stLoggerTitle, 'Department: ' + stDept);
			
			if (isEmpty(stDept))
			{
				// Set the Department column to NUL
				nlapiSetCurrentLineItemValue(stType, 'department', '');
			}
			else
			{	
				// If Department field has value, populate the Department column on the current transaction line
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Setting department on the current line...');
				nlapiSetCurrentLineItemValue(stType, 'department', stDept, true, true);
			}
		}
		
		return true;
    } 
    catch (error)
    {
    	if (error.getDetails != undefined)
        {
            nlapiLogExecution('ERROR','Process Error',  error.getCode() + ': ' + error.getDetails());
            throw error;
        }
        else
        {
            nlapiLogExecution('ERROR','Unexpected Error', error.toString()); 
            throw nlapiCreateError('99999', error.toString());
        }
		
        return true;
    }
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Exit Field Changed Successfully');
}

/**
 * Check if value is empty
 * @param stValue
 * @returns {Boolean}
 */
function isEmpty(stValue)
{
	if ((stValue == '') || (stValue == null) ||(stValue == undefined))
    {
        return true;
    }
    
    return false;
}