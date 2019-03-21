/*******************************************************************************
 * The following javascript code is created by FMT Consultants LLC,
 * a NetSuite Partner. It is a SuiteFlex component containing custom code
 * intended for NetSuite (www.netsuite.com) and use the SuiteScript API.
 * The code is provided "as is": FMT Consultants LLC shall not be liable
 * for any damages arising out the intended use or if the code is modified
 * after delivery.
 *
 * Company:             FMT Consultants LLC, www.fmtconsultants.com
 * Author:              Elean Olguin - eolguin@fmtconsultants.com
 * File:                ITG_SSC_SetCCBudgetReports.js
 * Date:                Monday February 22nd 2015
 * Last Updated:        Monday March 28th 2016
 * Version :            1.7
 *
 * Requires:
 * EO_NS_JS_V3.js
 * LOEC_LIB_SetReportsPage.js
 * EO_LIB_NSTimeSelectors.js
 *
 * 07/09/2015  | Internal Function setNextScheduledExecution pre-calculates the next
 * 07/09/2015  | execution date and defines it in the script deployment.
 * 07/09/2015  | Updated all request functions to allow the submission of a request
 * 07/09/2015  | that generates all the reports and emails them in a single suitelet req.
 * 07/10/2015  | Added functions to consolidate June Budgets.
 * 09/11/2015  | Updated fix for CC email addresses issue.
 * 10/26/2015  | Updated library functions to adjust for FY change
 * 01/12/2016  | File name change
 *
 ***********************************************************************/
var g_context = nlapiGetContext();
var g_bustingMetering = false;
var g_isSuiteletReq = false;
var g_isScheduled = false;
var g_folderId = 113455;
var g_isProd = (g_context.getEnvironment() == 'PRODUCTION') ? true : false;
var g_emailParamsSet = false;
//Constants
var ITG_CCBDGT = {
    ADJUST_FISCAL_YEARS: ["63", "54"],
    ADJUST_FY_START: '54',
    BUSINESS_DAYS: 6,
    TEMP: 125266,
    NO_RESTRICTION_GROUP: g_isProd ? 5026352 : 5026352,
    XML_TEMPLATE: g_isProd ? 8027150 : 8027150,
    CONFIG: {
        ID: 'customrecord_fmt_ccbudget_config',
        FIELD_PREFIX: 'custrecord_fmt_ccbudget_config_',
        FIELDS: ['repid', 'repname', 'xlsname', 'rowsjson', 'coljson', 'colno']
    },
    COMPANY_NAME: 'FONTEM US INC',
    EMAIL_AUTHOR: 3,
    EMAIL_TITLE: 'FONTEM US INC Cost Center/Budget Reports',
    EMAIL_BODY: '[FMT] - This is an automated message.\n\n Attached are the Cost Center Budget Report files.\n\n',
    SS_SCRIPT_PARAMS: {
        'reqParams': 'custscript_fmt_reportparams',
        'bustedMetering': 'custscript_fmt_bustedmetering',
        'reqUser': 'custscript_fmt_requser',
        'isScheduled': 'custscript_fmt_isscheduled',
        'isManual': 'custscript_fmt_ismanual',
        'cc': 'custscript_fmt_ccrep_recipient',
        'sendtoall': 'custscript_fmt_sendtoall',
        'iswinpreq': 'custscript_fmt_iswinpreq',
        'emailParams': 'custscript_fmt_emailparams'
    },
    SS_DEPLOYMENT_ID: g_isProd ? 5174 : 5174,
    BACKUP_CC: ['shawn.luther@blucigs.com']
};
/**
 * Generates the Cost Center Reports, Saves them and emails
 * them to each respective cost center owner.
 * Reports are generated monthly.
 * @author : eolguin@fmtconsultants.com
 * @param : null
 * @return : null
 */
function setCCBudgetReports() {
    nlapiLogExecution('AUDIT', '[FMT] Cost Center Budget Reports', 'START');
    var xlsXmlStr = null;
    //Get Parameters
    var params = getSSScriptParams(ITG_CCBDGT.SS_SCRIPT_PARAMS);
    //Get File Cabinet Folder ID and set it as a global variable
    g_folderId = getBudgetReportsFolderId();
    nlapiLogExecution('AUDIT', '[FMT] Cost Center Budget Reports', 'File Cabinet Folder : ' + g_folderId);
    //Process Request
    if (params.isScheduled == 'T' && params.iswinpreq == 'T' && eo.js.isNumber(params.reqUser)) {
        nlapiLogExecution('DEBUG', '[FMT] Cost Center Budget Reports', 'processWinPopupRequest');
        processWinPopupRequest(params);
    } else if (params.isScheduled == 'T' && (params.isManual == null || params.isManual == 'F') && eo.js.isNumber(params.reqUser)) {
        nlapiLogExecution('DEBUG', '[FMT] Cost Center Budget Reports', 'processSuiteletRequest');
        processSuiteletRequest(params);
    } else if (params.isScheduled == 'T' && params.isManual == 'T' && eo.js.isNumber(params.reqUser)) {
        nlapiLogExecution('DEBUG', '[FMT] Cost Center Budget Reports', 'processManualRequest');
        processManualRequest(params);
    } else if (params.isScheduled == 'T' && params.isManual == 'F' && !eo.js.isNumber(params.reqUser)) {
        nlapiLogExecution('DEBUG', '[FMT] Cost Center Budget Reports', 'processScheduledRequest - 2');
        processScheduledRequest(params);
    }
    nlapiLogExecution('AUDIT', '[FMT] Cost Center Budget Reports', 'END');
}

/**
 * Returns the file cabinet id depending on the execution
 * environment. Runs a search on custom record that stores
 * the file cabinet folder internal ids to be used in a
 * customization.
 * @param :  null
 * @return : {Float} folderId
 * @author : eolguin@fmtconsultants.com
 */
function getBudgetReportsFolderId() {
    var filters = [];
    filters.push(new nlobjSearchFilter("internalid", null, "is", "2"));
    filters.push(new nlobjSearchFilter("isinactive", null, "is", "F"));
    var columns = {
        'folderId': (g_isProd ? new nlobjSearchColumn('custrecord_fmt_foldermap_prodid', null) : new nlobjSearchColumn('custrecord_fmt_foldermap_sbid', null)).setLabel('folderId')
    };
    var searchResults = eo.ns.getSearchResults("customrecord_fmt_foldermap", filters, eo.js.getArrayFromObject(columns));
    var results = (searchResults != null) ? eo.ns.getSearchResultArray(searchResults, columns) : [];
    return (results.length > 0) ? results[0].folderId : null;
}

/**
 * Retrieves parameter values from script record
 * @author : eolguin@fmtconsultants.com
 * @param : {Object} reqParams
 * @return : {Object} params
 */
function getSSScriptParams(paramMap) {
    var params = {};
    for (var id in paramMap) {
        if (paramMap.hasOwnProperty(id)) {
            params[id] = nlapiGetContext().getSetting('SCRIPT', paramMap[id]);
        }
    }
    params.reqParams = !paramMap.hasOwnProperty('reqParams') ? null : (params.reqParams) ? JSON.parse(params.reqParams) : null;
    nlapiLogExecution('AUDIT', '[FMT] Cost Center Reports - Parsed Parameters', JSON.stringify(params));
    return params;
}

/**
 * Returns each cost center owner reports and stores them in
 * the file cabinet
 * Budget vs Actual, Transactions, Open PO and Actual vs Open PO
 * @author : eolguin@fmtconsultants.com
 * @param : {Object} ccResult, {Object} params
 * @return : {Object} results
 */
function getCostCenterOwnerReports(ccResult, params) {
    var xmlStr = '';
    try {
        if (params != null) {
            if (!params instanceof Object) {
                throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', 'Missing a required argument : parameters');
            } else {
                var adjustedPeriods = ITG_CCBDGT.ADJUST_FISCAL_YEARS;
                params.year = params.year == 'ADJUSTED' ? ITG_CCBDGT.ADJUST_FY_START : params.year;
                updatedParamsTimeSelectors(params);

                var reports = new EO_XMLToXLS(ccResult, params);
                if (params == null) {
                    return reports.getAllReportsXML(null);
                } else {
                    //nlapiLogExecution('debug', 'params select split ', params.select.split(','));
                    if (params.hasOwnProperty('select')) {
                        return reports.getAllReportsXML(params.select.split(','));
                    }
                }
            }
        } else {
            throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', 'Missing a required argument : parameters are null');
        }
    } catch (e) {
        throw e;
        nlapiLogExecution('ERROR', 'getCostCenterOwnerReports', e);

    }
}

/**
 * Processes Suitelet Request
 * Request could be either for email sending or
 * busted metering.
 * @author : eolguin@fmtconsultants.com
 * @param : {Object} params
 * @return : null
 */
function processWinPopupRequest(params) {
    nlapiLogExecution('AUDIT', '[FMT] Cost Center Reports - Suitelet WinPOP Request', 'START');
    try {
        var searchParam = params.reqParams;
        //Get All Cost Center Owner Results
        if (params.hasOwnProperty('reqParams')) {
            if (params.reqParams.hasOwnProperty('allcc')) {
                if (params.reqParams.allcc == 'T') {
                    searchParam = null;
                }
            }
        }
        var ccResults = getCostCenterOwners(searchParam);
        if (ccResults.length > 0) {
            for (var k = 0; k < ccResults.length; k++) {
                xlsXmlStr = getCostCenterOwnerReports(ccResults[k], params.reqParams);
                if (xlsXmlStr != null) {
                    processAndYieldScript(60);
                    if (params.sendtoall == 'T') {
                        params.currentCCOwnerEmail = ccResults[k].ccOwnerEmail;
                    }
                    saveAndEmailReport(xlsXmlStr, ccResults[k], true, params);
                }
            }
        }
    } catch (e) {
        nlapiLogExecution('ERROR', '[FMT] Cost Center Reports - Suitelet WINPOP Request - See Msg : ', e);
    }
    nlapiLogExecution('AUDIT', '[FMT] Cost Center Reports - Suitelet WINPOP Request', 'END');
}

/**
 * Processes Suitelet Request
 * Request could be either for email sending or
 * busted metering.
 * @author : eolguin@fmtconsultants.com
 * @param : {Object} params
 * @return : null
 */
function processSuiteletRequest(params) {
    nlapiLogExecution('AUDIT', '[FMT] Cost Center Reports - Suitelet Request', 'START');
    try {
        if ((params.bustedMetering == 'T' && params.reqParams != null) || (params.bustedMetering == 'F' && params.reqParams == null) || (params.reqParams != null && params.bustedMetering == 'F')) {
            var ccResults = getCostCenterOwners((params.reqParams.sendtoall == 'T') ? null : params.reqParams);
            if (ccResults.length > 0) {
                for (var k = 0; k < ccResults.length; k++) {
                    xlsXmlStr = getCostCenterOwnerReports(ccResults[k], params.reqParams);
                    if (xlsXmlStr != null) {
                        processAndYieldScript(60);
                        if (eo.js.isNumber(params.reqUser) && isNoRestrictions(params.reqUser)) {
                            ccResults[k].ccOwnerId = params.reqUser;
                        }
                        saveAndEmailReport(xlsXmlStr, ccResults[k], true, params);
                    }
                }
            }
        }
    } catch (e) {
        nlapiLogExecution('ERROR', '[FMT] Cost Center Reports - Suitelet Request - See Msg : ', e);
    }
    nlapiLogExecution('AUDIT', '[FMT] Cost Center Reports - Suitelet Request', 'END');
}

/**
 * Process Scheduled Request
 * Generates monthly reports
 * @author : eolguin@fmtconsultants.com
 * @param : {Object} params
 * @return : null
 */
function processScheduledRequest(params) {
    var xlsXmlStr = null;
    nlapiLogExecution('AUDIT', '[FMT] Cost Center Reports - Scheduled', 'START');
    try {
        var ccResults = getCostCenterOwners(null);
        if (ccResults.length > 0) {
            var allYears = getAllFiscalPeriods([new nlobjSearchFilter("isyear", null, "is", "T")]);
            if (allYears.length > 0) {
                for (var k = 0; k < ccResults.length; k++) {
                    var thisParams = getScheduledRequestParams(ccResults[k], allYears);
                    xlsXmlStr = getCostCenterOwnerReports(ccResults[k], thisParams);
                    if (xlsXmlStr != null) {
                        processAndYieldScript(60);
                        saveAndEmailReport(xlsXmlStr, ccResults[k], false, null);
                    }
                }
            }
        }
        //Sets the next execution date (for next month)
        setNextScheduledExecution();
    } catch (e) {
        nlapiLogExecution('ERROR', '[FMT] Cost Center Reports - Scheduled - See Msg: ', e);
    }
    nlapiLogExecution('AUDIT', '[FMT] Cost Center Reports - Scheduled', 'END');
}

/**
 * Function pre-calculates the next execution date
 * based on the Holiday Calendar defined
 * in the reports settings calendar record.
 * @author : elean.olguin@gmail.com
 * @param : {String} prefix
 * @return : {Object} results
 */
function setNextScheduledExecution() {
    //Pre Calculate Next Month Execution Date
    var execDate = getNextExecutionDate('_fmt_ccbudget_calendar', ITG_CCBDGT.BUSINESS_DAYS);
    nlapiLogExecution('AUDIT', '[FMT] Cost Center Budget Reports', 'Next Execution Date :' + nlapiDateToString(execDate));
    //Load Script Deployment
    var rec = eo.ns.loadRecord('scriptdeployment', ITG_CCBDGT.SS_DEPLOYMENT_ID);
    if (execDate != null && rec != null) {
        rec.setFieldValue('startdate', nlapiDateToString(execDate));
        //Set Execution Date Start Time
        rec.setFieldValue('starttime', '0600');
        eo.ns.submitRecord(rec);
    } else {
        nlapiLogExecution('ERROR', '[FMT] Scheduled Reports Error', 'Could not find a valid script deployment!');
    }
}

/**
 * Process Manual Request, generates monthly reports by manually
 * triggering the script from the deployment record.
 * @author : eolguin@fmtconsultants.com
 * @param : {Object} params
 * @return : null
 */
function processManualRequest(params) {
    var xlsXmlStr = null;
    nlapiLogExecution('AUDIT', '[FMT] Cost Center Reports - Manual', 'START');
    try {
        var ccResults = getCostCenterOwners(null);
        if (ccResults.length > 0) {
            var allYears = getAllFiscalPeriods([new nlobjSearchFilter("isyear", null, "is", "T")]);
            if (allYears.length > 0) {
                for (var k = 0; k < ccResults.length; k++) {
                    var thisParams = getScheduledRequestParams(ccResults[k], allYears);
                    xlsXmlStr = getCostCenterOwnerReports(ccResults[k], thisParams);
                    if (xlsXmlStr != null) {
                        processAndYieldScript(60);
                        var xlsFile = getXLSFileObj(xlsXmlStr, ccResults[k], true, params);
                        if (xlsFile != null) {
                            var reqUser = params.sendtoall == 'T' ? ccResults[k].ccOwnerId : params.reqUser;
                            nlapiLogExecution('DEBUG', 'what is param sendotall ' + params.sendtoall);
                            emailReport(reqUser, xlsFile, params);
                        }
                    }
                }
            }
        }
    } catch (e) {
        nlapiLogExecution('ERROR', '[FMT] Cost Center Reports - Scheduled - See Msg: ', e);
    }
    nlapiLogExecution('AUDIT', '[FMT] Cost Center Reports - Manual', 'END');
}

/**
 * Returns the Scheduled Execution Parameters
 * Sets Filters to Look for This Period/YTD
 * @author : elean.olguin@gmail.com
 * @param : {Object} ccResult, {Object} allYears
 * @return : {Object} params
 */
function getScheduledRequestParams(ccResult, allYears) {
    
    var params = {
        "ppname": null,
        "ispreview": "F",
        "download": "",
        "select": "1,2,3,4",

        "costcenter": ccResult.ccInternalId,

        "year": allYears[allYears.length - 1].internalid,
        "postingperiod" : "LP",
        "ppfrom": "",
        "ppto": "",
        "date": ""
    };

    var ts = new EO_NSTimeSelectors(ITG_ADJUST_FY, ITG_ADJUST_PERIODS);
    if (ts instanceof Object) {
        //Rf to change from Last Fiscal Year to current period  
        params.ppfrom = ts.LFY.start;
        params.ppto = ts.LFYTP.end;

        //params.ppfrom = ts.TFY.start;
        //params.ppto = ts[params.postingperiod].start;
    }
    return params;
}

/**
 * Saves XLS File Reports into the File Cabinet
 * and then sends it a given to Cost Center owner
 * @param {String} xlsXmlStr, {Object} ccResult, {Boolean} noRestrictions, {Object} params
 * @return null
 * @author eolguin@fmtconsultants.com
 */
function saveAndEmailReport(xlsXmlStr, ccResult, noRestrictions, params) {
    var xlsFile = null;
    var fileId = null;
    try {
        //Get and submit XLS File
        xlsFile = getXLSFileObj(xlsXmlStr, ccResult, noRestrictions, params);
        xlsFile.setFolder(g_folderId);
        fileId = nlapiSubmitFile(xlsFile);
        nlapiLogExecution('AUDIT', 'File Saved! ID# ', fileId);
    } catch (error) {
        nlapiLogExecution('ERROR', 'Could not save file. See Error Msg:  ', error);
    }
    //Send Email
    if (xlsFile != null) {
        emailReport(ccResult.ccOwnerId, xlsFile, params);
    }
}

/**
 * Creates the nlobjFile XLS File Report
 * @param {String} xlsXmlStr, {Object} ccResult, {Boolean} noRestrictions, {Object} params
 * @return {nlobjFile} xlsFile
 * @author eolguin@fmtconsultants.com
 */
function getXLSFileObj(xlsXmlStr, ccResult, noRestrictions, params) {
    var xlsFile = null;
    //Create XLS File
    try {
        var lookup = (!noRestrictions) ? null : nlapiLookupField('employee', params.reqUser, ['entityid', 'email']);
        var fileName = (lookup == null) ? ccResult.ccOwnerName : lookup.entityid.replace(' ', '') + '_NoCCRestrictions';
        //Create file
        xlsFile = nlapiCreateFile(eo.js.getSysDate() + '_CostCenterBudgetReports_' + ccResult.ccName + '_' + fileName + '.xls', 'EXCEL', nlapiEncrypt(xlsXmlStr, 'base64'));
    } catch (e) {
        nlapiLogExecution('ERROR', 'CREATE_FILE : ' + 'Could not create file. See error details.', e);
    }
    return xlsFile;
}

/**
 * Sends the report to the cost center or user specified
 * @param {Object} recipientId, {nlobjObject} xlsFile, {Object} params
 * @return null
 * @author eolguin@fmtconsultants.com
 */
function emailReport(recipientId, xlsFile, params) {
    var ccEmails = null;
    var bccEmails = null;
    nlapiLogExecution('debug', 'params', JSON.stringify(params));
    //Try parsing the email parameters first
    try {
        if (params != null) {
            if (params.hasOwnProperty('cc')) {
                if (!eo.js.isEmpty(params.cc)) {
                    ccEmails = params.cc.toString();
                }
            }
            if (params.hasOwnProperty('emailParams')) {
                if (!eo.js.isEmpty(params.emailParams)) {
                    var emailParams = JSON.parse(params.emailParams);
                    if (emailParams instanceof Object) {
                        if (emailParams.hasOwnProperty('recipients')) {
                            if (emailParams.recipients.length > 0) {
                                recipientId = emailParams.recipients.toString();
                                if (params.hasOwnProperty('currentCCOwnerEmail')) {
                                    if (!eo.js.isEmpty(params.currentCCOwnerEmail)) {
                                        recipientId += ',' + params.currentCCOwnerEmail;
                                    }
                                }
                            }
                        }
                        //Set CC, BBC, Subject and Message
                        if (emailParams.hasOwnProperty('from')) {
                            if (!eo.js.isEmpty(emailParams.from)) {
                                ITG_CCBDGT.EMAIL_AUTHOR = emailParams.from;
                            }
                        }
                        if (emailParams.hasOwnProperty('subject')) {
                            if (!eo.js.isEmpty(emailParams.subject)) {
                                ITG_CCBDGT.EMAIL_TITLE = emailParams.subject;
                            }
                        }
                        if (emailParams.hasOwnProperty('message')) {
                            if (!eo.js.isEmpty(emailParams.message)) {
                                ITG_CCBDGT.EMAIL_BODY = emailParams.message;
                            }
                        }
                        if (emailParams.hasOwnProperty('cc')) {
                            if (!eo.js.isEmpty(emailParams.cc)) {
                                ccEmails = ccEmails == null ? '' : ccEmails;
                                ccEmails += emailParams.cc.toString();
                            }
                        }
                        if (emailParams.hasOwnProperty('bcc')) {
                            if (!eo.js.isEmpty(emailParams.bcc)) {
                                bccEmails = bccEmails == null ? '' : bccEmails;
                                bccEmails = emailParams.bcc.toString();
                            }
                        }
                    }
                }
            }
        }

    } catch (ec) {
        nlapiLogExecution('ERROR', 'CC_ADDRESS_ERROR: Could parse CC Addresses. See Error Details.', ec);
    }
    //Try Sending the emails
    try {
        ccEmails = ccEmails == null ? ['shawn.luther@blu.com'] : ccEmails;
        nlapiLogExecution('AUDIT', 'Email Sent! Author : ' + ITG_CCBDGT.EMAIL_AUTHOR, 'Recipient : ' + recipientId + ' <br> CC : ' + ccEmails + ' <br> BCC:' + bccEmails);
        nlapiSendEmail(ITG_CCBDGT.EMAIL_AUTHOR, recipientId, ITG_CCBDGT.EMAIL_TITLE, ITG_CCBDGT.EMAIL_BODY, ccEmails, bccEmails, null, xlsFile);
        //nlapiSendEmail(2886515, 2886515, ITG_CCBDGT.EMAIL_TITLE, ITG_CCBDGT.EMAIL_BODY, ccEmails, bccEmails, null, xlsFile);
        nlapiLogExecution('AUDIT', 'Email Sent! Author : ' + ITG_CCBDGT.EMAIL_AUTHOR, 'Recipient : ' + recipientId + ' <br> CC : ' + ccEmails + ' <br> BCC:' + bccEmails);
    } catch (e) {
        nlapiLogExecution('ERROR', 'EMAIL_ERROR : ' + 'Could not send email. See error details.' + e);
    }
}

/**
 * Returns True/False if the user belongs to the No Cost Center Restrictions Group
 * @author : eolguin@fmtconsultants.com
 * @param : {String} reqUser
 * @return : {Boolean} True/False
 */
function isNoRestrictions(reqUser) {
    var noRes = nlapiSearchRecord('entitygroup', null, new nlobjSearchFilter('internalid', null, 'is', ITG_CCBDGT.NO_RESTRICTION_GROUP), new nlobjSearchColumn('internalid', "groupmember"));
    for (var int = 0; int < noRes.length; int++) {
        if (parseFloat(reqUser) == parseFloat(noRes[int].getValue('internalid', 'groupmember'))) {
            return true;
        }
    }
    return false;
}

/**
 * Yields a scheduled execution for a later time
 * @param {Float} lim
 * @return null
 * @author elean.olguin@gmail.com
 */
function processAndYieldScript(lim) {
    var currentUsage = parseInt(nlapiGetContext().getRemainingUsage());
    if (currentUsage <= lim) {
        if (nlapiGetContext().getExecutionContext() == 'scheduled') {
            var state = nlapiYieldScript();
            nlapiLogExecution('audit', 'Re-scheduling script, metering running low.', 'Yielding status ' + state.status);
            if (state.status == 'FAILURE') {
                nlapiLogExecution("ERROR", "Failed to yield script, exiting: Reason = " + state.reason + " / Size = " + state.size);
                throw nlapiCreateError('FAILED_TO_YIELD', "Failed to yield script, exiting: Reason = " + state.reason + " / Size = " + state.size, false);
            } else if (state.status == 'RESUME') {
                nlapiLogExecution("AUDIT", "Resuming script because of " + state.reason + ".  Size = " + state.size);
            }
        }
    }
}

/**
 * Function retrieves a holiday calendar dates from a custom
 * record in the system.
 * @author : elean.olguin@gmail.com
 * @param : {String} prefix
 * @return : {Object} results
 */
function getHolidayCalendar(prefix) {
    var filters = [];
    filters.push(new nlobjSearchFilter("isinactive", null, "is", "F"));
    var columns = {
        "date": new nlobjSearchColumn('custrecord' + prefix + "_date", null).setSort(false).setLabel("date"),
        "iswknd": new nlobjSearchColumn('custrecord' + prefix + "_iswknd", null).setLabel("iswknd"),
        "name": new nlobjSearchColumn("name", null).setLabel("name")
    };
    var searchResults = eo.ns.getSearchResults('customrecord' + prefix, filters, eo.js.getArrayFromObject(columns));
    return (searchResults != null) ? eo.ns.getSearchResultArray(searchResults, columns) : [];
}

/**
 * Returns the next execution date for a scheduled script
 * Default values are 6 business days and US Holidays
 * @author : elean.olguin@gmail.com
 * @param : {String} prefix
 * @return : {Object} results
 */
function getNextExecutionDate(prefix, businessDays) {
    //Use next month to calculate the execution date
    var today = nlapiAddMonths(new Date(), 1);
    var startMonthDate = nlapiStringToDate(today.getMonth() + 1 + '/' + 1 + '/' + today.getFullYear());
    return (new EO_USCalendar(startMonthDate, getHolidayCalendar(prefix), businessDays)).getScheduledDate();
}

/**
 * Returns the next execution date for a scheduled script
 * Default values are 6 business days and US Holidays
 * @author : elean.olguin@gmail.com
 * @param : {String} cusPrefix
 * @return : {Object} results
 */
function getExecutionSchedule() {
    var schedule = {};
    for (var k = 1; k <= 12; k++) {
        schedule['Month_' + k] = (new EO_USCalendar(nlapiStringToDate(k + '/1/2015'))).getScheduledDate();
    }
    return schedule;
}

/**
 * Function/Object dynamically calculates holidays
 * for any given year. Takes as a parameter an input date,
 * holiday object containing all holiday dates and the number
 * of business days to be considered.
 * @author : elean.olguin@gmail.com
 * @param : {Object} inputDate, {Object} holidays, {Float} businessDays
 * @return : {Object} EO_USCalendar
 */
var EO_USCalendar = function (inputDate, holidays, businessDays) {
    this.inputDate = inputDate;
    this.holidays = eo.js.isVal(holidays) ? this.getUserHolidays(holidays) : this.getDefaultHolidays();
    this.businessDays = eo.js.isVal(businessDays) ? businessDays : 6;
    return this.EO_USCalendar;
};
/**
 * @author : elean.olguin@gmail.com
 * @param : {Object} holidays
 * @return : {Object} thisHolidays
 */
EO_USCalendar.prototype.getUserHolidays = function (holidays) {
    var thisHolidays = {};
    var defaultHolidays = this.getDefaultHolidays();
    for (var k = 0; k < holidays.length; k++) {
        if (holidays[k].iswknd == 'T') {
            for (var id in defaultHolidays) {
                if (defaultHolidays.hasOwnProperty(id)) {
                    if (defaultHolidays[id] != null && defaultHolidays[id].indexOf(holidays[k].date) != -1) {
                        thisHolidays['id_' + k] = defaultHolidays[id];
                    }
                }
            }
        } else {
            thisHolidays['id_' + k] = eo.js.isVal(holidays[k].date) ? [holidays[k].date] : null;
        }
    }
    return thisHolidays;
};
/**
 * @author : elean.olguin@gmail.com
 * @param : null
 * @return : {Object} thisHolidays
 */
EO_USCalendar.prototype.getDefaultHolidays = function () {
    return {
        'isNewYear': ['1/1'],
        'isMartinLutherKing': ['1/3/1'],
        'isPresidentDay': ['2/3/1'],
        'isEasterHoliday': null,
        'isMemorialDayWeekend': ['5/3/6', '5/4/5', '5/4/1', '5/5/1'],
        'isIndependanceDay': ['7/3', '7/4'],
        'isLaborDayWeekend': ['9/1/1', '9/1/5'],
        'isThanksgivingWeekend': ['11/4/4', '11/4/5'],
        'isChristmasEve': ['12/24'],
        'isChristmasDay': ['12/25'],
    };
};
/**
 * @author : elean.olguin@gmail.com
 * @param : null
 * @return : {Object} workingDate
 */
EO_USCalendar.prototype.getScheduledDate = function () {
    this.inputDay = nlapiDateToString(this.inputDate).split('/')[1];
    this.dayCount = 0;
    //Add 6 working days and return the date once 6 days have elapsed excluding weekends and holidays from the count
    workingDate = this.getWorkingDay(this.inputDate);
    for (var k = 1; k < this.businessDays; k++) {
        workingDate = nlapiAddDays(workingDate, 1);
        workingDate = this.getWorkingDay(workingDate, k);
    }
    return workingDate;
};

/**
 * @author : Celigo Inc, elean.olguin@gmail.com
 * @param : {Object} dateToCalc
 * @return : {Object} dateToCalc
 */
EO_USCalendar.prototype.getWorkingDay = function (dateToCalc) {
    var add = true;
    while (this.isWeekend(dateToCalc) || this.isUSHoliday(dateToCalc)) {
        dateToCalc = nlapiAddDays(dateToCalc, 1);
        add = false;
    }
    this.dayCount += 1;
    return dateToCalc;
};

/**
 * @author : Celigo Inc, elean.olguin@gmail.com
 * @param : {Object} dateToCalc
 * @return : {Object} dateToCalc
 */
EO_USCalendar.prototype.isWeekend = function (dateToCalc) {
    //   6 = Saturday, 0 = Sunday
    return (dateToCalc.getDay() % 6 === 0);
};

/**
 * @author : elean.olguin@gmail.com
 * @param : {Object} dateToCalc
 * @return : {Boolean} True/False
 */
EO_USCalendar.prototype.isUSHoliday = function (dateToCalc) {
    this.n_date = dateToCalc.getDate(), this.n_month = dateToCalc.getMonth() + 1;
    this.n_wday = dateToCalc.getDay(), this.n_wnum = Math.floor((this.n_date - 1) / 7) + 1;
    this.s_date1 = this.n_month + '/' + this.n_date;
    this.s_date2 = this.n_month + '/' + this.n_wnum + '/' + this.n_wday;
    for (var id in this.holidays) {
        if (this.holidays.hasOwnProperty(id)) {
            if (this.isHoliday(this.holidays[id], dateToCalc)) {
                return true;
            } else {
                continue;
            }
        }
    }
};
/**
 * @author : elean.olguin@gmail.com
 * @param : {String} input, {Object} dateToCalc
 * @return : {Boolean} True/False
 */
EO_USCalendar.prototype.isHoliday = function (input, dateToCalc) {
    if (!eo.js.isVal(input)) {
        return this.isEaster(dateToCalc);
    } else {
        var s = input[0].split('/');
        if (s.length > 2) {
            return input.indexOf(this.s_date2) != -1 ? true : false;
        }
        if (s.length <= 2) {
            return input.indexOf(this.s_date1) != -1 ? true : false;
        }
    }
};
/**
 * @author : elean.olguin@gmail.com
 * @param : {Object} inputDate
 * @return : {Boolean} True/False
 */
EO_USCalendar.prototype.isEaster = function (inputDate) {
    var year = inputDate.getFullYear();
    var a = year % 19;
    var b = Math.floor(year / 100);
    var c = year % 100;
    var d = Math.floor(b / 4);
    var e = b % 4;
    var f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4);
    var k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var n0 = (h + l + 7 * m + 114);
    var n = Math.floor(n0 / 31) - 1;
    var p = n0 % 31 + 1;
    //Easter Sunday Day
    var date = new Date(year, n, p);
    //Verify if date is Easter Monday or Good Friday
    if (date.getDay() == 0) {
        inputDate = nlapiDateToString(inputDate);
        var easterMonday = nlapiDateToString(nlapiAddDays(date, 1));
        var goodFriday = nlapiDateToString(nlapiAddDays(date, -2));
        var easterSunday = nlapiDateToString(date);
        return (easterMonday == inputDate || goodFriday == inputDate || inputDate == easterSunday) ? true : false;
    } else {
        return false;
    }
};
