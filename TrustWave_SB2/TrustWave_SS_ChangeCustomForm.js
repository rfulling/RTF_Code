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

var LOG = {_DEBUG : 'DEBUG', _ERROR : 'ERROR', _AUDIT : 'AUDIT'};

/**
 * The purpose of this script is <changme>
 *
 * @param (string) <varname> <desc>
 * @return <desc>
 * @type string
 * @author William F. Bermudo
 * @version 1.0
 */
function fieldChanged_changeCustomForm(type, name, linenum)
{
    var funcTitle = 'fieldChanged_changeCustomForms';
    nlapiLogExecution(LOG._DEBUG, funcTitle, '===================== START =====================, type='+type+',name='+name);
    
    if (name != 'custbody_suppressed_invoice')
    {
        return true;
    }
    
    var isSuppressedInvc = nlapiGetFieldValue(name);
	var subsidiary = nlapiGetFieldValue('subsidiary');
    
    if (isSuppressedInvc == 'T' && subsidiary == '1')
    {
        nlapiSetFieldValue('customform', 112);
		nlapiLogExecution(LOG._DEBUG, funcTitle, 'US');
    }
	
	if (isSuppressedInvc == 'T' && subsidiary == '25')
    {
        nlapiSetFieldValue('customform', 172);
		nlapiLogExecution(LOG._DEBUG, funcTitle, 'Canada');
    } 
	if (isSuppressedInvc == 'F' && subsidiary == '40')
    {
        nlapiSetFieldValue('customform', 200);
		nlapiLogExecution(LOG._DEBUG, funcTitle, 'US');
    }
    if (isSuppressedInvc == 'T' && subsidiary == '40')
    {
        nlapiSetFieldValue('customform', 207);
		nlapiLogExecution(LOG._DEBUG, funcTitle, 'US');
    }
    
    return true;
}

function pageInit_changeCustomForm(type)
{
    var funcTitle = 'pageInit_changeCustomForm';
    nlapiLogExecution(LOG._DEBUG, funcTitle, '===================== START =====================, type='+type);
    
    var stCustomForm = nlapiGetFieldValue('customform');
	var subsidiary = nlapiGetFieldValue('subsidiary');
    
    if (stCustomForm == '112' || stCustomForm == '172')
    {
        return true;
    }
    
    var isSuppressedInvc = nlapiGetFieldValue('custbody_suppressed_invoice');
    nlapiLogExecution(LOG._DEBUG, funcTitle, 'isSuppressedInvc='+isSuppressedInvc);
    
    if (isSuppressedInvc == 'T' && subsidiary == '1')
    {
        nlapiSetFieldValue('customform', 112);
		nlapiLogExecution(LOG._DEBUG, funcTitle, 'US');
    }
	
	 if (isSuppressedInvc == 'T' && subsidiary == '25')
    {
        nlapiSetFieldValue('customform', 172);
		nlapiLogExecution(LOG._DEBUG, funcTitle, 'Canada');
    }
	
}