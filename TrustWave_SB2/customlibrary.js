/**
 * Copyright (c) 1998-2008 NetSuite, Inc.
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
 * Determines if a string variable is empty or not.  An empty string variable 
 * is one which is null or undefined or has a length of zero.
 *
 * @param (string) stValue The string value to test for emptiness. 
 * @return true if the variable is empty, false if otherwise.
 * @type boolean
 * @throws nlobjError isEmpty should be passed a string value.  The data type passed is {x} whose class name is {y}
 * @author Nestor M. Lim
 * @see isNullOrUndefined 
 * @version 1.5
 */
function isEmpty(stValue)
{
    if (isNullOrUndefined(stValue))
    {
        return true;
    }
    
    if (typeof stValue != 'string' && getObjectName(stValue) != 'String')
    {
        throw nlapiCreateError('10000', 'isEmpty should be passed a string value.  The data type passed is ' + typeof stValue + ' whose class name is ' + getObjectName(stValue));
    }

    if (stValue.length == 0)
    {
        return true;
    }

    return false;
}

/** 
 * Determines if a variable is either set to null or is undefined.
 *
 * @param (object) value The object value to test
 * @return true if the variable is null or undefined, false if otherwise.
 * @type boolean
 * @author Nestor M. Lim
 * @version 1.0
 */
function isNullOrUndefined(value)
{
    if (value === null)
    {
        return true;
    }
    
    if (value === undefined)
    {
        return true;
    }  
    
    return false;
}

/** 
 * Removes all line items from a sublist given its internal ID.
 * Works for Client Side scripts.
 *
 * @throws nlobjError Call to removeAllLineItems should be given a non empty string parameter.
 * @author Nestor M. Lim
 * @version 1.0
 */
function removeAllLineFromSublistClient(stSublistInternalId)
{
    if (isEmpty(stSublistInternalId) === true)
    {
        throw nlapiCreateError('10001', 'Call to removeAllLineItems should be given a non empty string parameter.');
    }
 
    window.isinited = true;   
    var intCurrentCount = nlapiGetLineItemCount(stSublistInternalId);
            
    if (intCurrentCount > 0)
    {
        for (var i  = intCount; i > 0; i--) 
        {
            window.isinited = true;
            nlapiSelectLineItem(stSublistInternalId, 1);
            window.isinited = true;
            nlapiRemoveLineItem(stSublistInternalId);
        }
    }   
}

/** 
 * Removes all line items from a given sublist inside a nlobjRecord object.
 *
 * @param (nlobjRecord) recObj The nlobjRecord object containing the sublist to be emptied
 * @param (string) stLineItemId The internal ID of the line item / sublist that should be emptied.
 * @author Nestor M. Lim
 * @version 1.0
 */
function removeAllLineItemsServer (recObj, stLineItemId) {
    var intCount = recObj.getLineItemCount(stLineItemId);
    
    for (var i  = intCount; i > 0; i--) {
        recObj.removeLineItem(stLineItemId, i);
    }
    
    return recObj;
}

/** 
 * Returns the object / class name of a given instance
 *
 * @param (object) a variable representing an instance of an object
 * @return the class name of the object
 * @type string
 * @author Nestor M. Lim
 * @version 1.0
 */
function getObjectName(object)
{
    if (isNullOrUndefined(object))
    {
        return object;
    }
    
    return /(\w+)\(/.exec(object.constructor.toString())[1];
}


/** 
 * If the value of the first parameter is null or undefined then the second parameter 
 * is returned.  Otherwise, the first parameter is returned.
 *
 * @param (object) source the parameter being tested
 * @param (object) destination the parameter returned if the first is null or undefined
 * @return the source, but if null, the destination
 * @type object
 * @throws nlobjError The parameters of this function must be of the same data type.
 * @author Nestor M. Lim
 * @version 1.0
 */
function ifNull(source, destination)
{
    if (isNullOrUndefined(source))
    {
        return destination;
    }
    
    if (typeof source != typeof destination)
    {
        throw nlapiCreateError('10004', 'The parameters of this function must be of the same data type.');
    }
    
    if (getObjectName(source) != getObjectName(destination))
    {
        throw nlapiCreateError('10005', 'The parameters of this function must be of the same data type.');
    }
    
    
    return source;
}

/** 
 * Returns the number of time units between two dates.  Valid time units are: milliseconds,
 * seconds, minutes, hour, day.  Time units are in absolute value.
 *
 * @param (Date) date1 first date 
 * @param (Date) date2 second date 
 * @param (Date) stTime represents what time unit to use as basis in computing the time difference 
 *               between two dates.  Valid values: MS, SS, MI, HR, D
 *
 * @return number of time units between the two dates.
 * @type int
 * @throws nlobjError Both parameters should be of type Date
 * @throws nlobjError Only the following target time units are valid:  MS, SS, MI, HR, D 
 *
 * @author Nestor M. Lim
 * @version 1.0
 */
function timeBetween(date1, date2, stTime) 
{
    if (getObjectName(date1) != 'Date' || getObjectName(date2) != 'Date')
    {
        throw nlapiCreateError('10008', 'Both parameters should be of type Date');
    }
    
    if (stTime != 'MS' && stTime != 'SS' && stTime != 'MI' && stTime != 'HR'
        && stTime != 'D')
    {
        throw nlapiCreateError('10009', 'Only the following target time units are valid:  MS, SS, MI, HR, D');
    }
    
    // The number of milliseconds in one time unit
    var intOneTimeUnit = 1; 
    
    switch (stTime)
    {
        case 'D':
            intOneTimeUnit *= 24;
        case 'HR':
            intOneTimeUnit *= 60;
        case 'MI':
            intOneTimeUnit *= 60;
        case 'SS':
            intOneTimeUnit *= 1000;
    }
    
    // Convert both dates to milliseconds
    var intDate1 = date1.getTime();
    var intDate2 = date2.getTime();

    // Calculate the difference in milliseconds
    var intDifference = Math.abs(intDate1 - intDate2);
    
    // Convert back to time units and return
    return Math.round(intDifference / intOneTimeUnit);
}

/** 
 * Returns the last day/number of days for a given month and year.
 *
 * @param (int) intMonth the month whose number of days/last day is being determined.
 * @param (int) intYear the year whose number of days/last day is being determined.
 *
 * @return last day/number of days of the month and year.
 * @type int
 * @throws nlobjError Valid months are from 0 (January) to 11 (December).
 *
 * @author Nestor M. Lim
 * @version 1.0
 */
function daysInMonth(intMonth, intYear) 
{
    if (intMonth < 0 || intMonth > 11)
    {
        throw nlapiCreateError('10010', 'Valid months are from 0 (January) to 11 (December).');
    }
    
    var lastDayArray = [
        31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31
    ];
    
    if (intMonth != 1) 
    {
        return lastDayArray[intMonth];
    }
    
    if (intYear % 4 != 0) 
    {
        return lastDayArray[1];
    }
    
    if (intYear % 100 == 0 && intYear % 400 != 0)
    {
        return lastDayArray[1];
    }        
        
    return lastDayArray[1] + 1;
} 


/**
 * The purpose of this script is to check if the value passed to
 * it is empty or zero.
 *
 * @param (string) stValue the value being tested
 * @return true if the value is empty or zero, false if otherwise
 * @type boolean
 * @author Ruel Dizon
 * @version 1.0
 */
function isEmptyOrZero(stValue)
{
    if (isEmpty(stValue) || stValue == 0)
    {
        return true;
    }
    else
    {
        return false;
    }
}

/** 
 * Removing duplicate entries or values from a Javascript array. 
 *
 * @param (Array) array the array being tested for duplicates
 * @return New array with no duplicate elements  
 * @type Array
 * @author Fernie P. Baguio
 * @version 1.0
 */
function removeDuplicates(array) 
{
    if (isNullOrUndefined(array))
    {
        return array;
    }
    
    var arrNew = new Array();
    
    o: for (var i = 0, n = array.length; i < n; i++) 
    {
        for (var x = 0, y = arrNew.length; x < y; x++)
        {
            if(arrNew[x] == array[i]) 
            {
                continue o;     
            }    
        }
        
        arrNew[arrNew.length] = array[i];
   }
   
   return arrNew;
}

/** 
 * The purpose of this script is search value from the array
 *
 * @param (string) val the value being searched 
 * @param (array) arr the array where the value is being searched
 * @return true if the value is found, false if otherwise.
 * @type boolean
 * @author Ruel Dizon
 * @version 1.0
 */
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

/** 
 * Gets the item price based using the price level
 *
 * @return the price of the item at the given price level
 * @type float
 * @author Nestor M. Lim
 * @version 1.0
 */
function getItemPrice(stItemId, stPriceLevel)
{
    if (stPriceLevel == '1')
    {
        return nlapiLookupField('item', stItemId, 'baseprice');
    }
    else
    {
        var arrRateFilters = [
            new nlobjSearchFilter('internalid', null, 'is', stItemId)
        ];

        var arrRateColumns = [
            new nlobjSearchColumn('otherprices')
        ];

        var arrRateResults = nlapiSearchRecord('item', null, arrRateFilters, arrRateColumns);
        
        return arrRateResults[0].getValue('price' + stPriceLevel);    
    }   
}

/** 
 * Formats a float value by adding commas and an optional currency symbol
 * ($ 999,999.99)
 *
 * @param (float) flValue the value to be formatted
 * @param (string) stCurrencySymbol the currency symbol to prefix the formatted
 * value
 * 
 * @return the float value formatted with the currency symbol, if specified.
 * @type string
 * @author Nestor M. Lim
 * @version 1.0
 */
function formatCurrency(flValue, stCurrencySymbol) 
{
    if (isNullOrUndefined(flValue))
    {
        return 0;
    }
    
    if (typeof flValue != 'number' && getObjectName(flValue) != 'Number')
    {
        throw nlapiCreateError('10011', 'formatCurrency should be passed a number value.  The data type passed is ' + typeof flValue + ' whose class name is ' + getObjectName(flValue));
    }
    
    var flNumber = flValue;
    
    flNumber = flNumber.toString().replace(/\$|\,/g, '');
    
    if (isNaN(flNumber))
    {
        flNumber = "0";    
    }
    
    var bSign = (flNumber == (flNumber = Math.abs(flNumber)));
    
    flNumber = Math.floor(flNumber * 100 + 0.50000000001);
    
    var intCents = flNumber % 100;
    
    flNumber = Math.floor(flNumber / 100).toString();
    
    if (intCents < 10)
    {
        intCents = "0" + intCents;    
    }
    
    for (var i = 0; i < Math.floor((flNumber.length - (1 + i)) / 3); i++)
    {
        flNumber = flNumber.substring(0, flNumber.length - (4 * i + 3)) + ',' 
            + flNumber.substring(flNumber.length - (4 * i + 3));        
    }
    
    return (((bSign) ? '' : '-') + ifStringEmpty(stCurrencySymbol, '') + flNumber + '.' + intCents);
}

// New methods under the String object


/** 
 * Removes all leading and trailing spaces on the string object.
 *
 * @return the trimmed String object 
 * @type String
 * @author Nestor M. Lim
 * @version 1.0
 */
String.prototype.trim = function String_trim()
{
    if (this === null)
    {
        return null;
    }
    
    return this.replace(/^\s*/, '').replace(/\s+$/, '');
};

/** 
 * Returns the left zero-padded number based on the number of digits
 *
 * @param (int) intTotalDigits Number of Digits
 * @return the zero-padded number based on the number of digits
 * @type String 
 * @author Ruel Dizon
 * @version 1.0
 */
String.prototype.leftPadWithZeroes = function String_leftPadWithZeroes(intTotalDigits) 
{ 
    var stPaddedString = ''; 
    
    if (intTotalDigits > this.length) 
    { 
        for (var i = 0; i < (intTotalDigits - this.length); i++) 
     { 
            stPaddedString += '0'; 
     } 
    } 
    
    return stPaddedString + this; 
} ;

/** 
 * Removes leading zeroes from a string with a number value.  Useful in 
 * calling parseInt.
 *
 * @return the string with leading zeroes already trimmed
 * @type String 
 * @author Nestor Lim
 * @version 1.0
 */
String.prototype.removeLeadingZeroes = function String_removeLeadingZeroes()
{
    if (isEmpty(this))
    {
        return this;
    }
    
    var stTrimmedString = this;
    
    for (var i = 0; i < stTrimmedString.length; i++)
    {
        if (stTrimmedString[i] === '0')
        {
            stTrimmedString = stTrimmedString.substring(1, stTrimmedString.length);
        }
        else
        {
            break;
        }
    }
    
    return stTrimmedString;
};

/**
 * The Logger object contains functions which simplifies the logging of messages
 * by:
 * 1.  Removing the need to determine if the log is for a Server Side or Client
 *     Side SuiteScript
 * 2.  Allows you to toggle printing of DEBUG type messages programmatically
 *     or through a Script parameter.
 *
 * @author Nestor M. Lim
 * @version 3.0
 */
function Logger() 
{
    /** Determines whether to print DEBUG type messages or not */
    var bEnableDebug = false;
    
   
    /** 
     * Enable printing of DEBUG type messages
     *
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.enableDebug = function Logger_enableDebug()
    {
        bEnableDebug = true;
    };
    
    /** 
     * Disable printing of DEBUG type messages
     *
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.disableDebug = function Logger_disableDebug()
    {
        bEnableDebug = false;
    };

    /** 
     * Prints a log either as an alert for CSS or a server side log for SSS
     *
     * @param (string) stType The type of log being printed. Can be set to DEBUG, ERROR, AUDIT, EMERGENCY
     * @param (string) stTitle The title of the log message - used in organizing logs
     * @param (string) stMessage The actual log message
     * @throws nlobjError No Log Type Defined
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.log = function Logger_log(stType, stTitle, stMessage)
    {
        if (isEmpty(stType))
        {
            throw nlapiCreateError('ERROR', 'Logging Error', 'No Log Type Defined');
        }
        
        stType = new String(stType);
        
        if (stType.trim() === 'DEBUG')
        {
           if (!bEnableDebug)
           {
               return;
           }
        }
        
        if (typeof nlapiLogExecution === 'undefined')
        {
            alert(stType + ' : ' + stTitle + ' : ' + stMessage);
        }
        else
        {
            nlapiLogExecution(stType, stTitle, stMessage);
        }                
    };
    
    /** 
     * Convenience method to log a DEBUG message
     *
     * @param (string) stTitle The title of the log message - used in organizing logs
     * @param (string) stMessage The actual log message
     * @throws nlobjError No Log Type Defined
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.debug = function Logger_debug(stTitle, stMessage)
    {
        this.log('DEBUG', stTitle, stMessage);
    };

    /** 
     * Convenience method to log an AUDIT message
     *
     * @param (string) stTitle The title of the log message - used in organizing logs
     * @param (string) stMessage The actual log message
     * @throws nlobjError No Log Type Defined
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.audit = function Logger_audit(stTitle, stMessage)
    {
        this.log('AUDIT', stTitle, stMessage);
    };

    /** 
     * Convenience method to log an ERROR message
     *
     * @param (string) stTitle The title of the log message - used in organizing logs
     * @param (string) stMessage The actual log message
     * @throws nlobjError No Log Type Defined
     * @author Nestor M. Lim
     * @version 1.0
     */
    this.error = function Logger_error(stTitle, stMessage)
    {
        this.log('ERROR', stTitle, stMessage);
    };
    
    /** 
     * Convenience method to log an EMERGENCY message
     *
     * @param (string) stTitle The title of the log message - used in organizing logs
     * @param (string) stMessage The actual log message
     * @throws nlobjError No Log Type Defined
     * @author Nestor M. Lim
     * @version 1.0
     */    
    this.emergency = function Logger_emergency(stTitle, stMessage)
    {
        this.log('EMERGENCY', stTitle, stMessage);
    };
	
	this.console = function Logger_console(stTitle, stMessage)
	{
		var message = ['Function:= ', stTitle, ' - ', stMessage].join('');
		console.log(message);
	};
}

/**
 * Get Object/Array Length
 * @version 1.0
 * @author William F. Bermudo
 */
function numRows(obj) {
     var ctr = 0;
     for (var k in obj) {
          if (obj.hasOwnProperty(k)) {
               ctr++;
          }
     }
     return ctr;
}
/**
 * Gets all the records of the search
 *  
 * 
 * @param {String}  searchId       - the search id of the saved search that will be used
 * @param {String}  recordType     - the record id where the search will be conducted
 * @param {Array}   searchFilter   - search filters to use, will be added to the saved
 *                                    if a search id was passed
 * @param {Array}   searchColumn   - columns to be returned, will be added to the saved
 *                                    search if search id was passed     
 * @returns {nlobjSearchResult[]}
 */
function getSearchResults(searchId, recordType, searchFilter, searchColumn) {
     
     /**
      * @type nlobjSearchResult[]
      */
     var returnSearchResults = [];
     
     var savedSearch;
     if (isEmpty(searchId) === false) {
          savedSearch = nlapiLoadSearch(recordType, searchId);
          // add search filter if one is passed
          if (isNullOrUndefined(searchFilter) === false) {
               savedSearch.addFilters(searchFilter);
          }
          // add search column if one is passed
          if (isNullOrUndefined(searchColumn) === false) {
               savedSearch.addColumns(searchColumn);
          }
     }
     else {
          savedSearch = nlapiCreateSearch(recordType, searchFilter, searchColumn);
     }
     
     var resultset = savedSearch.runSearch();
     
     var searchid = 0;
     do {
         var resultslice = resultset.getResults( searchid, searchid+1000 );
         for (var rs in resultslice) {
             returnSearchResults.push( resultslice[rs] );
             searchid++;
         }
     } while (resultslice.length >= 1000);          
     
     return returnSearchResults;
}
/**
 * Returns the domain of the netsuite environment where the script executed
 * 
 * @param      {Boolean} nsdebugger - indicates if the script is being tested
 *                                     in debugger
 * 
 * @returns    {String}
 */
function getNetsuiteURL(nsdebugger) {
     var linkUrl;
     switch (nlapiGetContext().getEnvironment()) {
          case "PRODUCTION":
               if (nsdebugger === true) {
                    linkUrl = 'https://debugger.netsuite.com';
               }
               else {
                    linkUrl = 'https://system.netsuite.com';
               }

               break;

          case "SANDBOX":
               if (nsdebugger === true) {
                    linkUrl = 'https://debugger.sandbox.netsuite.com';
               }
               else {
                    linkUrl = 'https://system.sandbox.netsuite.com';
               }
               break;

          case "BETA":
               if (nsdebugger === true) {
                    linkUrl = 'https://debugger.beta.netsuite.com';
               }
               else {
                    linkUrl = 'https://system.beta.netsuite.com';
               }
               break;
     }

     return linkUrl;
}
/**
 * Used for creating script-created searches, primarily simple searches with no sorting
 * 
 * Usage Example
 * var fils = new Array();
 * var filter0 = new Array(_RECORD_TYPE_FIELD, _JOIN, _OPERATOR, _COMPARISON),
 *     filter1 = new Array(_RECORD_TYPE_FIELD, _JOIN, _OPERATOR, _COMPARISON);
 *     
 * fils.push(filter0, filter1);
 *   
 * var cols = new Array();
 *     cols.push(_COLUMN);
 *     cols.push(_COLUMN);
 *       
 * var result = searchBuild(_RECORD_TYPE_ID, fils, cols);
 *
 * @param {String}  recordType -   record id where the search will be conducted 
 * @param {Array}   fils       -   two dimensional array (i x 4) containing the field values
 *                                  for nlobjSearchFilter    
 * @param {Array}   cols       -   two dimensional array (i x 3) containing the field values 
 *                                  for nlobjSearchColumn
 * @returns {nlobjSearchResult[]}
 */
function searchBuild(recordType, fils, cols)
{
    //takes a record type id, array of filter arrays and array of column arrays
    //returns a searchresultobject
    var searchFilter = new Array();
    var searchColumn = new Array();
    
    if(fils)
    {
        for(var f = 0; f < fils.length; f++)
        {
             searchFilter[f] = new nlobjSearchFilter( 
                fils[f][0], //field name
                fils[f][1], //join, record idis
                fils[f][2], //operator
                fils[f][3]);//comparison value
        }
    }
    if(cols)
    {
        for(var c = 0; c < cols.length; c++)
        {
             searchColumn[c] = new nlobjSearchColumn(
                cols[c][0], //field name
                cols[c][1], //join id
                cols[c][2] //summary
                ); 
        } 
    }
    
    return getSearchResults(null, recordType, searchFilter, searchColumn); 

}
function createError (errorCode, errorDetails) {

     /** @type Object */
     var errorObject = {
          error : {}
     };

     var objError = nlapiCreateError (errorCode, errorDetails);

     errorObject.error.code = objError.getCode ();
     errorObject.error.details = objError.getDetails ();

     return errorObject;
}
/**
* Return an Object sorted by it's Key
*/
function sortObjectByKey (obj){

     var keys = [];
     var sorted_obj = {};

     for(var key in obj){
          if(obj.hasOwnProperty(key)){
               keys.push(key);
          }
     }

     // sort keys
     keys.sort();

     // create new array based on Sorted Keys
     for (var i = 0; i < keys.length; i++)
     {
          var k = keys[i];
          sorted_obj[k] = obj[k];
     }

     return sorted_obj;
}
function scriptRunning (scriptId, deploymentId, deployments) {

     var running = false;

     // loop thru the other deployments and check if they are processing
     for (var x = 0; x < deployments.length; x++ ) {
          // make sure the deployment id does not match the current deployment
          if (deploymentId != deployments[x]) {
               // check if running
               var status = nlapiScheduleScript(scriptId, deployments[x]);

               if ((status == 'INQUEUE') || (status == 'INPROGRESS')) {
                    running = true;
                    break;
               }
          }
     }

     return running;
}
function getSearchResults_old(searchId, recordType, searchFilter, searchColumn) {

     // variables for handling search results of more than 1000 records
     var maxInternalId        = 0;
     var resultCount          = 0;
     var init                 = true;
     var returnSearchResults  = [];
     
     while (resultCount == 1000 || init) {
          // filter for starting point
          searchFilter.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', maxInternalId));

          // call the saved search that will get all the records to be processed
          var searchResults = nlapiSearchRecord(recordType, searchId, searchFilter, searchColumn);

          // get the count
          resultCount = numRows(searchResults);

          if (resultCount == 0) {
               return returnSearchResults;
          }

          // collect all search results
          for (var x = 0; x < resultCount; x++) {

               returnSearchResults.push(searchResults[x]);
          }

          resultCount = (resultCount > 0) ? resultCount : 0;

          maxInternalId = parseInt(searchResults[resultCount - 1].getId(), 10);

          init = false;
          
          searchFilter.pop();
          
     }

     return returnSearchResults;
}
function daysBetween(date1, date2) {

    // The number of milliseconds in one day
    var ONE_DAY = 1000 * 60 * 60 * 24;

    // Convert both dates to milliseconds
    var date1_ms = date1.getTime();
    var date2_ms = date2.getTime();

    // Calculate the difference in milliseconds
    var difference_ms = Math.abs(date1_ms - date2_ms);

    // Convert back to days and return
    return Math.round(difference_ms/ONE_DAY);

}
/**
 * This function checks if any of the values passed are empty
 * Primarily used for checking if Script Parameters have values
 * 
 * @param {Object} scriptParameters
 * 
 * @returns {String}
 */
function parametersEmpty (scriptParameters) {
     
     var funcName = 'parametersEmpty';
     
     for(var key in scriptParameters){
          // check if each key has a value
          if (isEmpty(scriptParameters[key]) === true) {
               var empty = key;
               break;
          }
     }
     
     return empty;
}
function pausecomp(ms) {
     ms += new Date().getTime();
     while (new Date() < ms){}
}
function rescheduleScript(maxUsage)
{     
     var funcName = 'rescheduleScript';
     
     var startUsage = nlapiGetContext().getRemainingUsage();
     
     if(startUsage < (parseInt(maxUsage, 10) + parseInt(20, 10))) {
          var ys = nlapiYieldScript();
          if(ys.status == 'FAILURE') {
               nlapiLogExecution('ERROR', funcName, "Unable to Yield " + ys.reason + "<br/>Inforamtion: " + ys.information);
          }
          nlapiLogExecution("AUDIT", funcName, "After resume with: " + startUsage + " remaining vs max: " + maxUsage);
      }     
}