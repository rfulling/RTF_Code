/*******************************************************************************
 * The following javascript code is created by FMT Consultants LLC,
 * a NetSuite Partner. It is a SuiteFlex component containing custom code
 * intended for NetSuite (www.netsuite.com) and use the SuiteScript API.
 * The code is provided "as is": FMT Consultants LLC shall not be liable
 * for any damages arising out the intended use or if the code is modified
 * after delivery.
 *
 * Company:             FMT Consultants LLC, www.fmtconsultants.com
 * Author:              Elean Olguin, eolguin@fmtconsultants.com
 * File :               ITG_LIB_SetCCBudgetReports.js
 * Date:                Wednesday March 11th 2015
 * Last Updated:        Thursday April 21st 2016
 * Script :             Library
 * Version :            2.0
 *
 * Requires:
 *
 * EO_NS_JS_V3.js
 * LOEC_SSU_SetCCBudgetReports.js
 * LOEC_SSC_SetCCBudgetReports.js
 *
 * Suitelet Report IDS
 * Cost Center Budget Summary Report - 1
 * Cost Center Budget Detail Report - 2
 * Open Purchase Orders By Cost Center - 3
 * Cost Center Actual Open PO vs Budget Report - 4
 *
 * Contains functions to generate reports in csv format, shared by the Suitelet
 * and Scheduled script.
 *
 * Credits to Handsontable.com for jQuery Plugin.
 * http://handsontable.com/
 *
 *
 * 04/13/2015  | Replaced saved search filter for posting = T to display all transactions.
 * 07/10/2015  | Added functions to consolidate June Budgets.
 * 09/11/2015  | Added fix for corrupt files. _getXMLRowString function.
 * 10/26/2015  | Updated library functions to adjust for FY change.
 * 01/07/2016  | Added fix to ensure the correct XML Data Cell Type is used.
 * 01/07/2016  | Added filter to remove certain accounts from the reports.
 * 01/12/2016  | File name change
 * 02/01/2016  | Fix for dollar currency signs in all report cells
 *
 * ******************************************************************************/

//Accounts to exclude - 01/07/2016

var ITG_EXCLUDE_ACCOUNTS = ["663", "54", "1190", "108", "166", "167", "168", "445", "446", "447", "207", "208", "124", "825", "1177", "1178", "1179", "826", "174", "757", "758", "761", "762", "764", "763", "1091", "1092", "1180"];
var ITG_ADJUST_FY = ["63", "54"];
var ITG_ADJUST_PERIODS = ['65', '67'];
/**
 * @param {Object} reports
 * @return {Object} allReports
 * @author eolguin@fmtconsultants.com
 */
function canProcess() {
    if (g_isSuiteletReq) {
        if (parseInt(nlapiGetContext().getRemainingUsage()) > 80) {
            return true;
        } else {
            nlapiLogExecution('AUDIT', 'Metering running low on Suitelet, switching execution to Scheduled Script!', 'Current Metering : ' + parseInt(nlapiGetContext().getRemainingUsage()));
            return false;
        }
    }
    processAndYieldScript(100);
    return true;
}

/**
 * Returns a list of Cost Center Owners and
 * each CC internal id.
 * @author : eolguin@fmtconsultants.com
 * @param : {Object} params
 * @return : {Object} results
 */
function getCostCenterOwners(params) {
    var filters = [];
    if (params != null) {
        if (!eo.js.isEmpty(params.costcenter)) {
            if (eo.js.isNumber(params.costcenter)) {
                filters.push(new nlobjSearchFilter("internalid", null, "anyof", [params.costcenter]));
            } else {
                filters.push(new nlobjSearchFilter("internalid", null, "anyof", params.costcenter.split(',')));
            }
        }

    } else {
        filters.push(new nlobjSearchFilter("custrecord_cost_center_owner", null, "noneof", "@NONE@"));
    }
    var columns = {
        "ccInternalId": new nlobjSearchColumn("internalid", null).setLabel("ccInternalId"),
        "ccName": new nlobjSearchColumn("name", null).setSort(true).setLabel("ccName"),
        "ccOwner": new nlobjSearchColumn("custrecord_cost_center_owner", null).setLabel("ccOwner"),
        "ccOwnerId": new nlobjSearchColumn("internalid", "custrecord_cost_center_owner").setLabel("ccOwnerId"),
        "ccOwnerName": new nlobjSearchColumn("formulatext", null).setFormula("TO_CHAR({custrecord_cost_center_owner})").setLabel("ccOwnerName"),
        "ccOwnerEmail": new nlobjSearchColumn("email", "custrecord_cost_center_owner").setLabel("ccOwnerEmail")
    };
    var sr = eo.ns.getSearchResults("department", filters, eo.js.getArrayFromObject(columns));
    return (sr != null && sr.length > 0) ? eo.ns.getSearchResultArray(sr, columns) : [];
}

/**
 * Returns a current fiscal year periods given the start/end dates
 * entered in the filters.
 * @param {Object} reportParams, {Boolean} periodAsc
 * @return {Object} results
 * @author eolguin@fmtconsultants.com
 */
function getFiscalYearPeriods(params, periodAsc) {
    var filters = [];
    if (params != null) {
        if (eo.js.isNumber(params.year) && !eo.js.isNumber(params.ppfrom) && !eo.js.isNumber(params.ppto)) {
            filters.push(new nlobjSearchFilter("parent", null, "anyof", params.year));
            filters.push(new nlobjSearchFilter("isyear", null, "is", "F"));
            filters.push(new nlobjSearchFilter("isquarter", null, "is", "F"));
        } else {
            if (!eo.js.isEmpty(params.postingperiod)) {
                if (eo.js.isNumber(params.ppfrom) && !eo.js.isNumber(params.ppto)) {
                    params.ppto = params.ppfrom;
                } else if (!eo.js.isNumber(params.ppfrom) && eo.js.isNumber(params.ppto)) {
                    params.ppfrom = params.ppto;
                }
                if (params.ppfrom == params.ppto) {
                    var lookup = nlapiLookupField('accountingperiod', params.ppfrom, ['startdate', 'enddate']);
                    params.startdate = lookup.startdate;
                    params.enddate = lookup.enddate;
                } else {
                    params.startdate = nlapiLookupField('accountingperiod', params.ppfrom, 'startdate');
                    params.enddate = nlapiLookupField('accountingperiod', params.ppto, 'enddate');
                }
                if (!eo.js.isEmpty(params.startdate) && !eo.js.isEmpty(params.enddate)) {
                    filters.push(new nlobjSearchFilter("isyear", null, "is", "F"));
                    filters.push(new nlobjSearchFilter("isquarter", null, "is", "F"));
                    filters.push(new nlobjSearchFilter("isadjust", null, "is", "F"));
                    filters.push(new nlobjSearchFilter("startdate", null, "onorafter", params.startdate));
                    filters.push(new nlobjSearchFilter("enddate", null, "onorbefore", params.enddate));
                    setDefault = false;
                }
            }
        }
    }
    return getFiscalYearPeriodsResults(filters, periodAsc);
}

/**
 * Returns a current fiscal year periods given the start/end dates
 * entered in the filters.
 * @param {Object} reportParams
 * @return {Object} results
 * @author eolguin@fmtconsultants.com
 */
function getFiscalYearPeriodsResults(filters, periodAsc) {
    var columns = {
        "startdate": new nlobjSearchColumn("startdate", null).setLabel("startdate"),
        "enddate": new nlobjSearchColumn("enddate", null).setSort(false).setLabel("enddate"),
        "isclosed": new nlobjSearchColumn("closed", null).setLabel("isclosed"),
        "periodname": new nlobjSearchColumn("periodname", null).setLabel("periodname"),
        "fiscalperiod": new nlobjSearchColumn("internalid", null).setLabel("fiscalperiod")
    };
    if (typeof periodAsc != 'undefined') {
        if (periodAsc) {
            columns.enddate = columns.enddate.setSort(true);
        }
    }
    var sr = eo.ns.getSearchResults("accountingperiod", filters, eo.js.getArrayFromObject(columns));
    return (sr != null) ? eo.ns.getSearchResultArray(sr, columns) : [];
}

/**
 * Returns all fiscal periods
 * @author: eolguin@fmtconsultants.com
 * @param : {Object} cusFilters, {String} filteredFY
 * @return : {Object} results
 */
function getAllFiscalPeriods(cusFilters, filteredFY) {
    var getAll = true;
    var columns = {};
    var filters = [];
    filters.push(new nlobjSearchFilter("isadjust", null, "is", "F"));
    if (typeof cusFilters != 'undefined') {
        if (cusFilters != null) {
            filters = cusFilters;
            getAll = false;
        }
    }
    if (typeof filteredFY != 'undefined') {
        if (filteredFY == 'all') {
            getAll = true;
        } else {
            getAll = false;
            filters.push(new nlobjSearchFilter("periodname", null, "doesnotcontain", "Adjust"));
            filters.push(new nlobjSearchFilter("isquarter", null, "is", "F"));
            filters.push(new nlobjSearchFilter("isyear", null, "is", "F"));
            var parentIds = filteredFY == 'ADJUSTED' ? ITG_CCBDGT.ADJUST_FISCAL_YEARS : String(filteredFY);
            filters.push(new nlobjSearchFilter("parent", null, "anyof", parentIds));
            columns = {
                "startdate": new nlobjSearchColumn("startdate", null).setSort(false).setLabel("startdate"),
                "internalid": new nlobjSearchColumn("internalid", null).setLabel("internalid"),
                "periodname": new nlobjSearchColumn("periodname", null).setLabel("periodname")
            };
        }
    }
    if (getAll) {
        filters.push(new nlobjSearchFilter("isyear", null, "is", "F"));
        filters.push(new nlobjSearchFilter("isquarter", null, "is", "F"));
    }
    columns = {
        "startdate": new nlobjSearchColumn("startdate", null).setSort(false).setLabel("startdate"),
        "enddate": new nlobjSearchColumn("enddate", null).setLabel("enddate"),
        "periodname": new nlobjSearchColumn("periodname", null).setLabel("periodname"),
        "internalid": new nlobjSearchColumn("internalid", null).setLabel("internalid")
    };
    var searchResults = eo.ns.getSearchResults("accountingperiod", filters, eo.js.getArrayFromObject(columns));
    return (searchResults != null) ? eo.ns.getSearchResultArray(searchResults, columns) : [];
}

/**
 * Returns Report Configuration Settings
 * @param {String} repid
 * @return {Object} results
 * @author eolguin@fmtconsultants.com
 */
function getReportsConfig(repid) {
    var filters = [];
    if (repid != null) {
        filters.push(new nlobjSearchFilter("internalid", null, "anyof", repid));
        filters.push(new nlobjSearchFilter("custrecord_fmt_ccbudget_config_repid", null, "anyof", repid));
    }
    filters.push(new nlobjSearchFilter("custrecord_fmt_ccbudget_config_isreport", null, "is", 'T'));
    var columns = {
        "repid": new nlobjSearchColumn("custrecord_fmt_ccbudget_config_repid", null).setSort(false).setLabel("repid"),
        "repname": new nlobjSearchColumn("custrecord_fmt_ccbudget_config_repname", null).setLabel("repname"),
        "xlsname": new nlobjSearchColumn("custrecord_fmt_ccbudget_config_xlsname", null).setLabel("xlsname"),
        "rowsjson": new nlobjSearchColumn("custrecord_fmt_ccbudget_config_rowsjson", null).setLabel("rowsjson"),
        "coljson": new nlobjSearchColumn("custrecord_fmt_ccbudget_config_coljson", null).setLabel("coljson"),
        "headerjson": new nlobjSearchColumn("custrecord_fmt_ccbudget_config_hjson", null).setLabel("headerjson"),
        "colno": new nlobjSearchColumn("custrecord_fmt_ccbudget_config_colno", null).setLabel("colno")
    };
    var sr = eo.ns.getSearchResults(ITG_CCBDGT.CONFIG.ID, filters, eo.js.getArrayFromObject(columns));
    var results = (sr != null && sr.length > 0) ? eo.ns.getSearchResultArray(sr, columns) : [];
    return (results.length == 1) ? results[0] : results;
}

/**
 * Returns True/False if configuration file was set correctly.
 * @param {Object} config
 * @return {Boolean} True/False
 * @author eolguin@fmtconsultants.com
 */
function configFileSet(config) {
    if (config != null) {
        if (config.hasOwnProperty('rowsjson') && config.hasOwnProperty('coljson')) {
            config.rowsjson = (typeof config.rowsjson != 'object') ? JSON.parse(config.rowsjson) : config.rowsjson;
            config.coljson = (typeof config.coljson != 'object') ? JSON.parse(config.coljson) : config.coljson;
            if (config.coljson.length > 0 && config.rowsjson.length > 0) {
                return true;
            }
        } else {
            nlapiLogExecution('ERROR', 'An unexpected error has ocurred. Could not load configuration settings, please contact your Netsuite Administrator');
        }
    }
    nlapiLogExecution('ERROR', 'An unexpected error has ocurred. Could not load configuration settings, please contact your Netsuite Administrator');
    return false;
}

/**
 * Returns the Budget Amounts for a given cost center
 * @param {Object} ccInternalId, {Object} ytdperiodIds
 * @return {Object} results
 * @author eolguin@fmtconsultants.com
 */
function getBudgetCostCenterResults(ccInternalId, ytdperiodIds, actualpo) {
    var filters = [];
    filters.push(new nlobjSearchFilter("custrecord_fmt_budget_department", "custrecord_fmt_budget_account_budget", "anyof", ccInternalId));
    if (actualpo) {
        //filters.push(new nlobjSearchFilter("custrecord_fmt_budget_account_yearname", null, "is", String("FY " + new Date().getFullYear())));
        var stFiscalYear = getFiscalYear(ytdperiodIds);
        filters.push(new nlobjSearchFilter("custrecord_fmt_budget_account_yearname", null, "is", stFiscalYear));
    } else {
        filters.push(new nlobjSearchFilter("custrecord_fmt_budget_account_fiscalyearid", null, "anyof", ytdperiodIds));
    }
    nlapiLogExecution('DEBUG', 'here is the year I want ' + ytdperiodIds);
    var columns = {
        "yearname": new nlobjSearchColumn("custrecord_fmt_budget_account_yearname", null, 'group').setLabel("yearname"),
        "fcname": new nlobjSearchColumn("custrecord_fmt_budget_account_fiscalyearid", null, 'group').setLabel("fcname"),
        "fiscalperiod": new nlobjSearchColumn("internalid", "custrecord_fmt_budget_account_fiscalyearid", 'max').setLabel("fiscalperiod"),
        "accounttype": new nlobjSearchColumn("formulatext", null, 'group').setFormula(" CASE WHEN TO_CHAR({custrecord_fmt_budget_account_internalid.type}) = 'COGS' THEN 'Ordinary Income/Expense' ELSE TO_CHAR({custrecord_fmt_budget_account_internalid.type}) END").setLabel("accounttype"),
        "accountid": new nlobjSearchColumn("internalid", "custrecord_fmt_budget_account_internalid", 'group').setLabel("accountid"),
        'account': new nlobjSearchColumn('formulatext', null, 'max').setFormula("TRIM(REGEXP_REPLACE(REGEXP_REPLACE({custrecord_fmt_budget_account_internalid.name},'[^a-zA-Z'']', ' ') ,'[[:space:]]+', chr(32)))").setLabel('account'),
        "accnum": new nlobjSearchColumn("number", "custrecord_fmt_budget_account_internalid", 'group').setSort(false).setLabel("accnum"),
        "amount": new nlobjSearchColumn("custrecord_fmt_budget_account_fcamount", null, 'max').setLabel("amount"),
        "ccName": new nlobjSearchColumn("custrecord_fmt_budget_department", "custrecord_fmt_budget_account_budget", 'max').setLabel("ccName"),
        "costCenter": new nlobjSearchColumn("formulatext", null, 'max').setFormula("TO_CHAR({custrecord_fmt_budget_account_budget.custrecord_fmt_budget_department.id})").setLabel("costCenter"),
        "location": new nlobjSearchColumn("custrecord_fmt_budget_location", "custrecord_fmt_budget_account_budget", 'max').setLabel("location"),
    };
    var sr = eo.ns.getSearchResults("customrecord_fmt_budget_accounts", filters, eo.js.getArrayFromObject(columns));
    return (sr != null && sr.length > 0) ? eo.ns.getSearchResultArray(sr, columns) : [];
}

/**
 * Returns the Actual Amounts for a given cost center
 * @param {Object} ccInternalId, {Object} ytdperiodIds, {String} ppFilter, {Boolean} isAdjust
 * @return {Object} results
 * @author eolguin@fmtconsultants.com
 */

function getCostCenterActualResults(ccInternalId, ytdperiodIds, ppFilter) {
    var filters = [];
    if (ppFilter != null && !isFinite(parseFloat(ppFilter))) {
        filters = [[["account", "noneof", ITG_EXCLUDE_ACCOUNTS], "AND", ["memorized", "is", "F"], "AND", ["posting", "is", "T"], "AND", ["accounttype", "anyof", "COGS", "Expense", "Income", "OthExpense", "OthIncome"], "AND", ["department", "anyof", ccInternalId]], "AND", [["postingperiod", "rel", ppFilter]]];
    } else if (ytdperiodIds.length > 0) {
        if (ytdperiodIds.length == 1) {
            filters = [[["account", "noneof", ITG_EXCLUDE_ACCOUNTS], "AND", ["memorized", "is", "F"], "AND", ["posting", "is", "T"], "AND", ["accounttype", "anyof", "COGS", "Expense", "Income", "OthExpense", "OthIncome"], "AND", ["department", "anyof", ccInternalId]], "AND", [["postingperiod", "anyof", ytdperiodIds]]];
        } else {
            var periodFilters = [];
            var len = ytdperiodIds.length - 1;
            for (var m = 0; m < len; m++) {
                periodFilters.push(["postingperiod", "is", ytdperiodIds[m]], "OR");
            }
            periodFilters.push(["postingperiod", "is", ytdperiodIds[len]]);
            filters = [[["account", "noneof", ITG_EXCLUDE_ACCOUNTS], "AND", ["memorized", "is", "F"], "AND", ["posting", "is", "T"], "AND", ["accounttype", "anyof", "COGS", "Expense", "Income", "OthExpense", "OthIncome"], "AND", ["department", "anyof", ccInternalId]], "AND", [periodFilters]];
        }
    }
    var columns = {
        "accountid": new nlobjSearchColumn("account", null, "group").setLabel("accountid"),
        "accnum": new nlobjSearchColumn("number", "account", "group").setSort(false).setLabel("accnum"),
        'account': new nlobjSearchColumn('formulatext', null, 'max').setFormula("TRIM(REGEXP_REPLACE(REGEXP_REPLACE({account.name},'[^a-zA-Z'']', ' ') ,'[[:space:]]+', chr(32)))").setLabel('account'),
        "accounttype": new nlobjSearchColumn("formulatext", null, "group").setFormula("TO_CHAR({accounttype})").setLabel("accounttype"),
        "periodname": new nlobjSearchColumn("formulatext", null, "group").setFormula("TO_CHAR({postingperiod})").setLabel("periodname"),
        "fiscalperiod": new nlobjSearchColumn("postingperiod", null, "group").setLabel("fiscalperiod"),
        "amount": new nlobjSearchColumn("amount", null, "sum").setLabel("amount"),
        "costCenter": new nlobjSearchColumn("department", null, "group").setLabel("costCenter"),
        "ccName": new nlobjSearchColumn("formulatext", null, "group").setFormula("TO_CHAR({department})").setLabel("ccName"),
        "tranid": new nlobjSearchColumn("tranid", null, "group").setSort(true).setLabel("tranid"),
        "type": new nlobjSearchColumn("formulatext", null, "group").setFormula("TO_CHAR({type})").setLabel("type"),
        "otherrefnum": new nlobjSearchColumn("otherrefnum", null, "max").setLabel("otherrefnum")
    };
    var sr = eo.ns.getSearchResults("transaction", filters, eo.js.getArrayFromObject(columns));
    var results = (sr != null && sr.length > 0) ? eo.ns.getSearchResultArray(sr, columns) : [];
    if (ytdperiodIds.length > 0) {
        results = results.filter(function (res) {
            return ytdperiodIds.indexOf(res.fiscalperiod) != -1 ? true : false;
        });
    }
    return results;
}

/**
 *
 * Returns Cost Center Budget Report Details Results
 * @param {Object} ccInternalId, {Object} accPeriods, {String} ppFilter
 * @return {Object} results
 * @author eolguin@fmtconsultants.com
 */
function getCCBudgetDetailResults(ccInternalId, ytdperiodIds, ppFilter) {
    var filters = [];
    if (ppFilter != null && !isFinite(parseFloat(ppFilter))) {
        filters.push(new nlobjSearchFilter("postingperiod", null, "rel", ppFilter));
        filters.push(new nlobjSearchFilter("department", null, "anyof", ccInternalId));
        filters.push(new nlobjSearchFilter("memorized", null, "is", "F"));
        filters.push(new nlobjSearchFilter("posting", null, "is", "T"));
        filters.push(new nlobjSearchFilter("accounttype", null, "anyof", ["COGS", "Expense", "Income", "OthExpense", "OthIncome"]));
        filters.push(new nlobjSearchFilter("internalid", "account", "noneof", ITG_EXCLUDE_ACCOUNTS));
    } else if (ytdperiodIds.length > 0) {
        if (ytdperiodIds.length == 1) {
            filters = [[["account", "noneof", ITG_EXCLUDE_ACCOUNTS], "AND", ["memorized", "is", "F"], "AND", ["posting", "is", "T"], "AND", ["accounttype", "anyof", "COGS", "Expense", "Income", "OthExpense", "OthIncome"], "AND", ["department", "anyof", ccInternalId]], "AND", [["postingperiod", "is", ytdperiodIds]]];
        } else {
            var periodFilters = [];
            var len = ytdperiodIds.length - 1;
            for (var m = 0; m < len; m++) {
                periodFilters.push(["postingperiod", "is", ytdperiodIds[m]], "OR");
            }
            periodFilters.push(["postingperiod", "is", ytdperiodIds[len]]);

            filters = [[["account", "noneof", ITG_EXCLUDE_ACCOUNTS], "AND", ["memorized", "is", "F"], "AND", ["posting", "is", "T"], "AND", ["accounttype", "anyof", "COGS", "Expense", "Income", "OthExpense", "OthIncome"], "AND", ["department", "anyof", ccInternalId]], "AND", [periodFilters]];
        }
    }
    var columns = {
        "entityname": new nlobjSearchColumn("formulatext", null, "group").setFormula("TO_CHAR({mainname})").setLabel("entityname"),
        "accountid": new nlobjSearchColumn("account", null, "group").setLabel("accountid"),
        "accnum": new nlobjSearchColumn("number", "account", "group").setSort(false).setLabel("accnum"),
        'account': new nlobjSearchColumn('formulatext', null, 'group').setFormula("TRIM(REGEXP_REPLACE(REGEXP_REPLACE({account.name},'[^a-zA-Z'']', ' ') ,'[[:space:]]+', chr(32)))").setLabel('account'),
        "periodname": new nlobjSearchColumn("periodname", "accountingperiod", "group").setLabel("periodname"),
        "fiscalperiod": new nlobjSearchColumn("internalid", "accountingperiod", "group").setLabel("fiscalperiod"),
        "accounttype": new nlobjSearchColumn("formulatext", null, "group").setFormula("TO_CHAR({accounttype})").setLabel("accounttype"),
        "amount": new nlobjSearchColumn("amount", null, "sum").setLabel("amount"),
        "department": new nlobjSearchColumn("department", null, "group").setLabel("department"),
        "tranid": new nlobjSearchColumn("tranid", null, "max").setSort(true).setLabel("tranid"),
        "otherrefnum": new nlobjSearchColumn("formulatext", null, "group").setFormula("CASE WHEN {createdfrom.id} IS NULL THEN '' ELSE TO_CHAR({createdfrom.tranid}) END ").setLabel("otherrefnum"),
        "costCenter": new nlobjSearchColumn("department", null, "max").setLabel("costCenter"),
        "trandate": new nlobjSearchColumn("trandate", null, "max").setLabel("trandate"),
        "memo": new nlobjSearchColumn("memo", null, "group").setLabel("memo"),
        "sapdocdesc": new nlobjSearchColumn("custbody_celigo_sap_document_desc", null, "max").setLabel("sapdocdesc"),
        "type": new nlobjSearchColumn("formulatext", null, "group").setFormula("TO_CHAR({type})").setLabel("type")
    };
    var sr = eo.ns.getSearchResults("transaction", filters, eo.js.getArrayFromObject(columns));
    var res = (sr != null && sr.length > 0) ? eo.ns.getSearchResultArray(sr, columns) : [];

    if (ytdperiodIds.length > 0) {
        res = res.filter(function (res) {
            return ytdperiodIds.indexOf(res.fiscalperiod) != -1 ? true : false;
        });
    }
    return res;
}

/**
 * Returns all Open PO's in the system for a given cost center
 * Filters out PO's with the following status:
 * Closed, Fully Billed, Pending Approval, Rejected
 * @param {Object} ccInternalId, {Object} ytdperiodIds, {String} ppFilter
 * @return {Object} results
 * @author eolguin@fmtconsultants.com
 */
function getOpenPOByCCResults(ccInternalId, toDate, fromDate) {
    var filters = [];

    if (fromDate) {
        filters.push(new nlobjSearchFilter("trandate", null, "within", fromDate, toDate));
    }
    else {
        filters.push(new nlobjSearchFilter("trandate", null, "onorbefore", toDate));
    }

    filters.push(new nlobjSearchFilter("department", null, "anyof", ccInternalId));
    filters.push(new nlobjSearchFilter("memorized", null, "is", "F"));
    filters.push(new nlobjSearchFilter("type", null, "anyof", "PurchOrd"));
    filters.push(new nlobjSearchFilter("status", null, "anyof", ["PurchOrd:A", "PurchOrd:B", "PurchOrd:D", "PurchOrd:E", "PurchOrd:F"]));
    filters.push(new nlobjSearchFilter("accounttype", null, "noneof", "NonPosting"));
    filters.push(new nlobjSearchFilter("type", null, "anyof", "PurchOrd"));
    //Exclude Accounts - eolguin@fmtconsultants.com - Jan 11 16
    filters.push(new nlobjSearchFilter("internalid", "account", "noneof", ITG_EXCLUDE_ACCOUNTS));

    var columns = {
        "totalamount": new nlobjSearchColumn("total", null, "max").setSort(true).setLabel("totalamount"),
        "entityid": new nlobjSearchColumn("mainname", null, "group").setLabel("entityid"),
        "fiscalperiod": new nlobjSearchColumn("postingperiod", null, "group").setLabel("fiscalperiod"),
        "entityname": new nlobjSearchColumn("formulatext", null, "group").setFormula("TO_CHAR({mainname})").setLabel("entityname"),
        "accounttype": new nlobjSearchColumn("formulatext", null, "group").setFormula("TO_CHAR({accounttype})").setLabel("accounttype"),
        "statusref": new nlobjSearchColumn("formulatext", null, "group").setFormula("TO_CHAR({statusref})").setLabel("statusref"),
        'account': new nlobjSearchColumn('formulatext', null, 'max').setFormula("TRIM(REGEXP_REPLACE(REGEXP_REPLACE({account.name},'[^a-zA-Z'']', ' ') ,'[[:space:]]+', chr(32)))").setLabel('account'),
        "accountid": new nlobjSearchColumn("account", null, "group").setLabel("accountid"),
        "accnum": new nlobjSearchColumn("number", "account", "group").setSort(false).setLabel("accnum"),
        "tranid": new nlobjSearchColumn("tranid", null, "group").setSort(false).setLabel("tranid"),
        "costCenter": new nlobjSearchColumn("department", null, "group").setLabel("costCenter"),
        "trandate": new nlobjSearchColumn("trandate", null, "max").setLabel("trandate"),
        "duedate": new nlobjSearchColumn("duedate", null, "max").setLabel("duedate"),
        "memo": new nlobjSearchColumn("memomain", null, "group").setLabel("memo"),
        "type": new nlobjSearchColumn("formulatext", null, "max").setFormula("TO_CHAR({type})").setLabel("type"),
        "quantity": new nlobjSearchColumn("quantity", null, "sum").setLabel("quantity"),
        "openpoamount": new nlobjSearchColumn("formulacurrency", null, "max").setFormula("CASE WHEN MAX(ABS({totalamount})) != SUM(ABS({amount})) THEN (CASE WHEN MAX(ABS({amountunbilled})) < SUM(ABS({amount})) THEN MAX(ABS({amountunbilled})) ELSE SUM(ABS({amount})) END) ELSE MAX(ABS({amountunbilled})) END").setLabel("openpoamount"),
        "amount": new nlobjSearchColumn("formulacurrency", null, "max").setFormula("CASE WHEN SUM(ABS({amount})) = MAX(ABS({totalamount})) AND SUM(ABS({amount})) != MAX(ABS({amountunbilled})) THEN MAX(ABS({amountunbilled})) ELSE SUM(ABS({amount}))  END").setLabel("amount")
    };
    var sr = eo.ns.getSearchResults("transaction", filters, eo.js.getArrayFromObject(columns));
    return (sr != null && sr.length > 0) ? eo.ns.getSearchResultArray(sr, columns) : [];
}

/**
 * Function creates single or multiple results based on the cost center id given
 * July 9th 15 - Added AdjustPeriods parameter to adjust FY 2015 changes.
 * @param {Object} ccResult, {Object} params
 * @return {String} csvString
 * @author eolguin@fmtconsultants.com
 */
var EO_XMLToXLS = function (ccResult, params, adjustedPeriods) {
    var dateSet = false;
    this.includeAllYTD = params.select.length == 1 ? true : false;
    nlapiLogExecution('DEBUG', 'includeAllYTD = ' + this.includeAllYTD, JSON.stringify(params.select));

    this.ppFrom = params.ppfrom;
    this.isAdjust = false;
    this.toDate = null;
    this.params = params;
    this.ppFilter = null;
    // Define Cost Center ID and Name
    this.ccInternalId = ccResult.ccInternalId;
    this.ccName = ccResult.ccName;
    // Set Fiscal Year Periods
    if (this.params != null) {
        if (this.params.hasOwnProperty('date')) {
            if ((!eo.js.isEmpty(this.params.date) && this.params.select.indexOf("3") != -1)) {
                this.ytdperiodIds = null;
                this.periodLabel = '';
                this.toDate = this.params.date;
                nlapiLogExecution('DEBUG', 'On Or Before Date', this.toDate);
                dateSet = true;
            }
        }
    }
    //Set Default Date Values
    if (!dateSet) {
        var fiscalPeriods = getFiscalYearPeriods(this.params, true);
        this._setDefaultDates(fiscalPeriods);
        dateSet = true;
    }
    // Set XML Workbook Excel Schema if report is not being previewed
    if (this.params != null) {
        if (params.ispreview != 'T') {
            this.setXMLSchema();
        }
    }
    // Set Reports Functions
    this.reports = {
        getBudgetSummary: 1,
        getBudgetDetail: 2,
        getOpenPOByCC: 3,
        getBudgetVsActualPO: 4
    };

    return this.EO_XMLToXLS;
};
/**
 * Sets the reporting default reporting dates
 * @param : {Object} fiscalPeriods
 * @return : null
 * @author : eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype._setDefaultDates = function (fiscalPeriods) {
    this.toDate = fiscalPeriods[0].enddate;
    this.currentperiodId = (fiscalPeriods != null) ? fiscalPeriods[0].fiscalperiod : null;
    this.currentperiod = (fiscalPeriods != null) ? fiscalPeriods[0].periodname : '';

    this.ytdperiod = (fiscalPeriods != null) ? fiscalPeriods[fiscalPeriods.length - 1].periodname : '';
    //Set YTD Periods
    this.ytdperiodIds = (fiscalPeriods != null) ? eo.js.getUniqueArray(fiscalPeriods, 'fiscalperiod') : null;
    this.periodLabel = (fiscalPeriods != null) ? (eo.js.getUniqueArray(fiscalPeriods, 'periodname')).join(' | ') : '';

    nlapiLogExecution('DEBUG', 'Current Period ID :  ' + this.currentperiodId + ' , Name : ' + this.currentperiod, 'YTD Period : ' + this.ytdperiod + '<br /> Period Label :' + this.periodLabel + '<br /> YTD Period IDs: <br />' + JSON.stringify(this.ytdperiodIds));
    if (this.params != null) {
        this.periodLabel = (!this.params.hasOwnProperty('ppname')) ? this.periodLabel : !eo.js.isEmpty(this.params.ppname) ? this.params.ppname : this.periodLabel;
        this.periodLabel = (parseFloat(this.params.postingperiod) == -7) ? this.currentperiod : this.periodLabel;
        //Set Adjust Periods Labels
        if (this.currentperiodId == '62' || this.currentperiodId == '65') {
            this.periodLabel = (fiscalPeriods != null) ? fiscalPeriods[0].periodname + ' - ' + fiscalPeriods[1].periodname : '';
            this.isAdjust = true;
        }
        //Set Posting Period Filter for Transaction Searches
        this.ppFilter = (parseFloat(this.params.postingperiod) != 0 || parseFloat(this.params.postingperiod) != -9) ? this.postingperiod : null;
        //Set Current/YTD Period Values
        if ((parseFloat(this.params.postingperiod) != 0 || parseFloat(this.params.postingperiod) != -9) && eo.js.isNumber(this.params.ppto) && eo.js.isNumber(this.params.ppfrom)) {

            if (parseFloat(this.params.postingperiod) == -7) {
                this.currentperiodId = this.params.ppfrom;
            } else {
                this.currentperiodId = eo.js.isNumber(this.params.ppto) ? this.params.ppto : this.currentperiodId;
            }
        }
    }
};

/**
 * Sets XML Workbook Schema
 * @param null
 * @return null
 * @author eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype.setXMLSchema = function () {
    //Load Pre-defined template
    var xmlTemplate = eo.ns.loadFile(ITG_CCBDGT.XML_TEMPLATE);
    //var xmlTemplate = null;
    //Then Set XML/XLS Workbook Schema
    this.xmlTemp = (xmlTemplate != null) ? xmlTemplate.getValue() : this._getDefaultTemplate();
    this.schema = {
        ws: '<Worksheet ss:Name="{worksheetname}">',
        table: '<Table ss:DefaultColumnWidth="200" ss:DefaultRowHeight="16"> <Column ss:Index="1" ss:Width="230" ss:Span="3"/> <Column ss:AutoFitWidth="0" ss:Width="115" /> {customrows} </Table> <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"> <PageLayoutZoom>0</PageLayoutZoom> <Selected/> <Panes> <Pane> <Number>3</Number> <ActiveRow>21</ActiveRow> <ActiveCol>4</ActiveCol> </Pane> </Panes> <ProtectObjects>False</ProtectObjects> <ProtectScenarios>False</ProtectScenarios> </WorksheetOptions> </Worksheet>',
        header: '<Row ss:Height="15"> <Cell ss:MergeAcross="9" ss:StyleID="s63"> <Data ss:Type="String"> {companyname} </Data> </Cell> </Row> <Row ss:Height="17"> <Cell ss:MergeAcross="9" ss:StyleID="s65"> <Data ss:Type="String">{reportname}</Data> </Cell> </Row><Row ss:Height="17"> <Cell ss:MergeAcross="9" ss:StyleID="s65"> <Data ss:Type="String"> {costcenter} </Data> </Cell> </Row> <Row ss:Height="17"> <Cell ss:MergeAcross="9" ss:StyleID="s65"> <Data ss:Type="String"> {reportdate} </Data> </Cell> </Row> <Row ss:Height="17"> <Cell ss:MergeAcross="9" ss:StyleID="s65"> <Data ss:Type="String"></Data> </Cell> </Row>',
        rowOpen: '<Row>',
        headerCell: '<Cell ss:StyleID="s66">',
        dataCell: '<Cell ss:StyleID="s72">',
        boldCell: '<Cell ss:StyleID="s73">',
        dataCellTyStr: '<Data ss:Type="String">',
        dataCellTyNum: '<Data ss:Type="Number">',
        dataClose: '</Data>',
        cellClose: '</Cell>',
        rowClose: '</Row>'
    };
    //Set Reports Workbook headers (Company Name, Reporting Dates, CC)
    this.schema.header = this.schema.header.replace(RegExp('{companyname}', 'g'), ITG_CCBDGT.COMPANY_NAME);
    this.schema.header = this.schema.header.replace(RegExp('{reportdate}', 'g'), String(this.params.date).split('/').length > 1 ? ('Date On Or Before : ' + this.params.date) : this.periodLabel);
    this.schema.header = this.schema.header.replace(RegExp('{costcenter}', 'g'), this.ccName);
};

/**
 * Returns an XML Template if loading of template
 * failed.
 * @param :  null
 * @return :  {String} defaultXMLTemplate
 * @author :  eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype._getDefaultTemplate = function () {
    nlapiLogExecution('debug', 'Default template is being used');
    return '<?xml version="1.0"?> <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40"> <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"> <Author>FMT Consultants Reports</Author> <LastAuthor>Elean Olguin</LastAuthor> <Company>FMT Consultants</Company> </DocumentProperties> <OfficeDocumentSettings xmlns="urn:schemas-microsoft-com:office:office"> <AllowPNG/> </OfficeDocumentSettings> <ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel"> <WindowHeight>6240</WindowHeight> <WindowWidth>10000</WindowWidth> <WindowTopX>120</WindowTopX> <WindowTopY>140</WindowTopY> <ProtectStructure>False</ProtectStructure> <ProtectWindows>False</ProtectWindows> </ExcelWorkbook> <Styles> <Style ss:ID="Default" ss:Name="Normal"> <Alignment ss:Vertical="Bottom"/> <Borders/> <Font ss:Size="10"/> <Interior/> <NumberFormat/> <Protection/> </Style> <Style ss:ID="s63"> <Alignment ss:Horizontal="Center" ss:Vertical="Bottom"/> <Font ss:Size="12" ss:Bold="1"/> </Style> <Style ss:ID="s65"> <Alignment ss:Horizontal="Center" ss:Vertical="Bottom"/> <Font ss:Size="14" ss:Bold="1"/> </Style> <Style ss:ID="s66"> <Alignment ss:Horizontal="Right" ss:Vertical="Bottom"/> <Font ss:Size="7" ss:Bold="1"/> <Interior ss:Color="#C0C0C0" ss:Pattern="Solid"/> </Style> <Style ss:ID="s72"> <Alignment ss:Horizontal="Right" ss:Vertical="Bottom" ss:Indent="0"/> <NumberFormat ss:Format="&quot;$&quot;#,##0.00"/> <Borders/> </Style><Style ss:ID="s73"> <Alignment ss:Horizontal="Right" ss:Vertical="Bottom" ss:Indent="0"/> <Font ss:Size="8" ss:Bold="1"/> <NumberFormat ss:Format="&quot;$&quot;#,##0.00"/> <Borders/> </Style> </Styles> {customcontent} </Workbook>';

};

/**
 * Returns an object containing data formatted
 * to be displayed on Preview Mode using Handson jQuery Plugin.
 * @param :  {Object} reqId
 * @return :  {Object} handsonData/null
 * @author :  eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype.getPreviewReport = function (reqId) {
    var previewReport = null;
    var handsonData = [];
    var config = getReportsConfig(reqId);
    if (configFileSet(config)) {
        for (var id in this.reports) {
            if (this.reports.hasOwnProperty(id)) {
                if (parseFloat(this.reports[id]) == parseFloat(reqId)) {
                    previewReport = this[id](config);
                    break;
                }
            }
        }
        if (previewReport != null) {
            nlapiLogExecution('AUDIT', '[FMT] Cost Center Budget Reports', 'Previewing Report #' + this.reports[id]);
            if (previewReport.hasOwnProperty('header')) {
                if (previewReport.header != null) {
                    handsonData = handsonData.concat([previewReport.header]);
                }
            }
            // Set report rows
            if (previewReport.hasOwnProperty('rows')) {
                //nlapiLogExecution('ERROR', 'ROWS', JSON.stringify(previewReport.rows));
                for (var k = 0; k < previewReport.rows.length; k++) {
                    if (typeof previewReport.rows[k] == 'object') {
                        if (previewReport.rows[k] != null) {
                            handsonData = handsonData.concat([removeDollarSigns(previewReport.rows[k])]);
                        }
                    } else {
                        if (previewReport.rows[k] != null) {
                            handsonData.push([previewReport.rows[k], '', '', '', '', '', '', '', '']);
                        }
                    }
                }
            }
            // Set Grand Total Rows
            if (previewReport.hasOwnProperty('grandTotal')) {
                if (previewReport.grandTotal != null) {
                    handsonData = handsonData.concat([previewReport.grandTotal[k]]);
                }
            }
        } else {
            return [['-  No Data Found - ']];
        }
    }
    return handsonData.filter(function (arr) {
        return (typeof arr != 'object') ? false : arr.length > 0 ? true : false;
    });
};

/**
 * Gets and returns all reports in XML/XLS format.
 * @param {Object} reqIds
 * @return {Object} xmlString
 * @author eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype.getAllReportsXML = function (reqIds) {
    var allReports = {};
    var allConfig = getReportsConfig(null);
    for (var id in this.reports) {
        if (this.reports.hasOwnProperty(id)) {
            if (reqIds == null) {
                var config = eo.js.findObj(allConfig, 'repid', this.reports[id]);
                if (canProcess() && configFileSet(config)) {
                    nlapiLogExecution('AUDIT', '[FMT] Cost Center Budget Reports', 'Generating Report #' + this.reports[id]);
                    allReports['id_' + this.reports[id]] = this[id](config);
                } else {
                    g_bustingMetering = true;
                    return null;
                }
            } else {
                if (canProcess()) {
                    if (reqIds.indexOf(String(this.reports[id])) != -1) {
                        var config = eo.js.findObj(allConfig, 'repid', this.reports[id]);
                        if (configFileSet(config)) {
                            nlapiLogExecution('AUDIT', '[FMT] Cost Center Budget Reports', 'Generating Report #' + this.reports[id]);
                            allReports['id_' + this.reports[id]] = this[id](config);
                        }
                    }
                } else {
                    g_bustingMetering = true;
                    return null;
                }
            }
        }
    }
    return this._getReportsXMLStr(allReports);
};

/**
 * ADJUSTED FUNCTION
 * Returns the Budget Summary Report
 * object containing all the report properties,
 * @param {Object} config, {Boolean} isXML
 * @return {Object} report
 * @author eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype.getBudgetSummary = function (config, isXML) {

    var budgetResults = getBudgetCostCenterResults(this.ccInternalId, this.ytdperiodIds);
    var ytdResults = getCostCenterActualResults(this.ccInternalId, this.ytdperiodIds, this.ppFilter);
    var currentResults = getCostCenterActualResults(this.ccInternalId, [this.currentperiodId]);

    if (this.isAdjust) {
        this._adjustPeriodChange([budgetResults, currentResults, ytdResults]);
    }
    var allResults = this._getAllAccounts(budgetResults, currentResults, ytdResults);
    var accoTypes = eo.js.groupArray(allResults, 'secKey');

    for (var k = 0; k < accoTypes.length; k++) {
        var repValues = [];
        for (var m = 0; m < accoTypes[k].values.length; m++) {
            repValues.push(this._getCurrentAndYTDRow(accoTypes[k].values[m], currentResults, budgetResults, ytdResults));
        }
        accoTypes[k].values = repValues;
    }
    return this._getBudgetReportsObject(config, accoTypes, isXML, true);
};
/**
 * Returns Cost Center Budget Report Details Report Object
 * @param {Object} config
 * @return {Object} report
 * @author eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype.getBudgetDetail = function (config) {
    var ccBudgetDetails = [];
    var rows = [];
    var ytdperiodIds = (this.params == null) ? this.ytdperiodIds : parseFloat(this.params.postingperiod) == -7 ? [String(this.params.ppfrom)] : this.ytdperiodIds;

    nlapiLogExecution('debug', 'this.ytdperiodIds', JSON.stringify(this.ytdperiodIds));
    //ONLY DISPLAY CURRENT PERIOD VALUES UNLESS IS CUSTOM RANGE
    if (this.includeAllYTD) {
        ccBudgetDetails = getCCBudgetDetailResults(this.ccInternalId, this.ytdperiodIds, this.ppFilter);
    } else {
        ccBudgetDetails = getCCBudgetDetailResults(this.ccInternalId, [String(this.currentperiodId)], this.ppFilter);
    }

    if (this.isAdjust) {
        //Get Last Fiscal Year Jan 2015-June 2015A YTD Values for YTD Calculations and combine them
        if (ytdperiodIds.indexOf('65') != -1) {
            ccBudgetDetails = ccBudgetDetails.concat(getCCBudgetDetailResults(this.ccInternalId, ['62'], null));
            this._adjustPeriodChange([ccBudgetDetails]);
        }
    }
    if (ccBudgetDetails.length > 0) {
        var tranByAcco = eo.js.groupArray(ccBudgetDetails, 'accnum', 'account', 'accounttype');
        if (tranByAcco != null) {
            var subTotal = 0;
            for (var m = 0; m < tranByAcco.length; m++) {
                // Push the Account Number and Name Rows
                if (m == 0) {
                    rows.push(tranByAcco[m].secKey);
                    rows.push([tranByAcco[m].key + ' ' + tranByAcco[m].altKey]);
                }
                for (var k = 0; k < tranByAcco[m].values.length; k++) {
                    var thisRow = [];
                    for (var p = 0; p < config.rowsjson.length; p++) {
                        if (config.rowsjson[p] == null) {
                            thisRow.push('');
                        } else if (tranByAcco[m].values[k].hasOwnProperty(config.rowsjson[p])) {
                            if (config.rowsjson[p] == 'amount') {
                                thisRow.push(eo.js.toDollarCurrency(tranByAcco[m].values[k][config.rowsjson[p]]));
                                subTotal += parseFloat(tranByAcco[m].values[k][config.rowsjson[p]]);
                            } else {
                                thisRow.push(tranByAcco[m].values[k][config.rowsjson[p]]);
                            }
                        }
                    }
                    rows.push(thisRow);
                }
                if ((m + 1) < tranByAcco.length) {
                    if (tranByAcco[m].key != tranByAcco[m + 1].key) {
                        rows.push(['Total - ' + tranByAcco[m].key + ' ' + tranByAcco[m].altKey, eo.js.toDollarCurrency(subTotal)]);
                        subTotal = 0;
                        if (tranByAcco[m].secKey != tranByAcco[m + 1].secKey) {
                            rows.push(tranByAcco[m + 1].secKey);
                        }
                        rows.push([tranByAcco[m + 1].key + ' ' + tranByAcco[m + 1].altKey]);
                    }
                } else if ((m + 1) >= tranByAcco.length) {
                    rows.push(['Total - ' + tranByAcco[m].key + ' ' + tranByAcco[m].altKey, eo.js.toDollarCurrency(subTotal)]);
                }
            }
        }
    }
    return {
        id: config.repid,
        name: config.repname,
        xlsname: config.xlsname,
        header: config.coljson,
        rows: rows,
        grandTotal: ['Grand Total ', eo.js.toDollarCurrency(eo.js.sumArray(ccBudgetDetails, 'amount'))]
    };
};

/**
 * Returns Open PO By Cost Center CSV Report Object
 * @param {Object} config
 * @return {Object} report
 * @author eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype.getOpenPOByCC = function (config) {
    var stFromDate = getDateFromAccPeriod(this.ppFrom);
    var openPOs = getOpenPOByCCResults(this.ccInternalId, this.toDate, stFromDate);
    if (this.isAdjust) {
        //Get Last Fiscal Year Jan 2015-June 2015A YTD Values for YTD Calculations and combine them
        this._adjustPeriodChange([openPOs]);
    }
    var rows = [];
    var grandTotal = ['Grand Total  '];
    if (openPOs.length > 0) {
        var poByAcco = eo.js.groupArray(openPOs, 'accnum', 'account', 'accounttype');
        if (poByAcco != null) {
            for (var m = 0; m < poByAcco.length; m++) {
                if (m == 0) {
                    rows.push([poByAcco[m].key + ' ' + poByAcco[m].altKey]);
                }
                for (var k = 0; k < poByAcco[m].values.length; k++) {
                    var thisRow = [];
                    for (var p = 0; p < config.rowsjson.length; p++) {
                        if (config.rowsjson[p] == null) {
                            thisRow.push('');
                        } else if (poByAcco[m].values[k].hasOwnProperty(config.rowsjson[p])) {
                            if (config.rowsjson[p].indexOf('amount') != -1) {
                                thisRow.push(eo.js.toDollarCurrency(poByAcco[m].values[k][config.rowsjson[p]]));
                            } else {
                                thisRow.push(poByAcco[m].values[k][config.rowsjson[p]]);
                            }
                        }
                    }
                    rows.push(thisRow);
                }
                var total = eo.js.fillArray(['Total - ' + poByAcco[m].key + ' ' + poByAcco[m].altKey], eo.js.indexOfContains(config.rowsjson, 'amount'));
                total.push(eo.js.toDollarCurrency(eo.js.sumArray(poByAcco[m].values, 'totalamount')), eo.js.toDollarCurrency(eo.js.sumArray(poByAcco[m].values, 'openpoamount')));
                rows.push(total);
                if (m + 1 < poByAcco.length) {
                    if (poByAcco[m].key != poByAcco[m + 1].key) {
                        rows.push([poByAcco[m + 1].key + ' ' + poByAcco[m + 1].altKey]);
                    }
                }
            }
            grandTotal = eo.js.fillArray(grandTotal, eo.js.indexOfContains(config.rowsjson, 'amount'));
            grandTotal.push(eo.js.toDollarCurrency(eo.js.sumArray(openPOs, 'totalamount')), eo.js.toDollarCurrency(eo.js.sumArray(openPOs, 'openpoamount')));
        }
    }
    return {
        id: config.repid,
        name: config.repname,
        xlsname: config.xlsname,
        header: config.coljson,
        rows: rows,
        grandTotal: grandTotal
    };
};

/**
 * Returns the Actual vs Open PO Report
 * object containing all the report properties,
 * @param {Object} config, {Boolean} isXML
 * @return {Object} report
 * @author eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype.getBudgetVsActualPO = function (config, isXML) {
    var currentResults = getOpenPOByCCResults(this.ccInternalId, this.toDate);
    var ytdResults = getCostCenterActualResults(this.ccInternalId, this.ytdperiodIds, this.ppFilter);
    var budgetResults = getBudgetCostCenterResults(this.ccInternalId, this.ytdperiodIds, 'actualpo');
    if (this.isAdjust) {
        this._adjustPeriodChange([budgetResults, currentResults, ytdResults]);
    }
    var allResults = this._getAllAccounts(budgetResults, currentResults, ytdResults);
    var accoTypes = eo.js.groupArray(allResults, 'secKey');
    //Group by Account Type
    for (var k = 0; k < accoTypes.length; k++) {
        var repValues = [];
        for (var m = 0; m < accoTypes[k].values.length; m++) {
            repValues.push(this._getBudgetVsActualPORow(accoTypes[k].values[m], ytdResults, budgetResults, currentResults));
        }
        accoTypes[k].values = repValues;
    }
    return this._getBudgetReportsObject(config, accoTypes, isXML, false);
};

/**
 * Returns all the reports XML string formatted in XLS
 * workbooks.
 * @param {Object} reports
 * @return {Object} xmlWorksheets
 * @author eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype._getReportsXMLStr = function (reports) {
    var xmlStr = this.xmlTemp;
    var xmlWorksheets = '';
    for (var id in reports) {
        if (reports.hasOwnProperty(id)) {
            var thisWS = this.schema.ws;
            thisWS = thisWS.replace(RegExp('{worksheetname}', 'g'), reports[id].xlsname);
            var xmlRows = this._getWorkbookTableRows(reports[id]);
            var thisWSTable = this.schema.table;
            thisWSTable = thisWSTable.replace(RegExp('{customrows}', 'g'), xmlRows);
            xmlWorksheets += thisWS + thisWSTable;
        }
    }
    //Replace Custom Content from Template and return XML String
    return xmlStr.replace(RegExp('{customcontent}', 'g'), xmlWorksheets);
};

/**
 * Returns a string containing the report header.
 * @param {Object} reports, {Boolean} isXML
 * @return {Object} header
 * @author eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype._getReportHeader = function (report, isXML) {
    var thisHeader = this.schema.header;
    thisHeader = thisHeader.replace('{reportname}', report.name);
    return !eo.js.isVal(isXML) ? eo.js.arrayToArray(thisHeader) : thisHeader;
};

/**
 * Returns an XML string containing an XLS Table
 * @param {Object} report
 * @return {Object} thisWS
 * @author eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype._getWorkbookTableRows = function (report) {
    //Set Workbook Schema
    var thisXMLRows = this._getReportHeader(report, true);
    if (report.hasOwnProperty('header')) {
        //Set Rows Header
        thisXMLRows += this._getXMLHeaderString(report.header, true);
    }
    if (report.hasOwnProperty('rows')) {
        //Set Report Rows
        for (var k = 0; k < report.rows.length; k++) {
            if (typeof report.rows[k] == 'object') {
                //If the row is not a sub header, extract each row
                thisXMLRows += this._getXMLRowString(report.rows[k]);
            } else {
                //Build regular row
                thisXMLRows += this.schema.rowOpen + this.schema.boldCell + this.schema.dataCellTyStr + report.rows[k] + this.schema.dataClose + this.schema.cellClose + this.schema.rowClose;
            }
        }
    }
    // Set Grand Total Rows
    if (report.hasOwnProperty('grandTotal')) {
        thisXMLRows += this._getXMLRowString(report.grandTotal, true);
    }
    return thisXMLRows;
};

/**
 * Returns an XML string containing row/header values
 * in XLS format.
 * @param {Object} rowArray
 * @return {String} thisXML
 * @author eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype._getXMLHeaderString = function (rowArray) {
    var thisXML = this.schema.rowOpen;
    for (var k = 0; k < rowArray.length; k++) {
        thisXML += this.schema.headerCell + this.schema.dataCellTyStr + rowArray[k] + this.schema.dataClose + this.schema.cellClose;
    }
    return thisXML + this.schema.rowClose;
};

/**
 * Returns an XML string containing row values in XLS format
 * @param {Object} rowArray, {Boolean} allBold
 * @return {String} thisXML
 * @author eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype._getXMLRowString = function (rowArray, allBold) {
    allBold = (!eo.js.isVal(allBold)) ? false : allBold;
    var thisXML = this.schema.rowOpen;
    for (var k = 0; k < rowArray.length; k++) {
        if (rowArray[k].indexOf('Total') != -1) {
            allBold = true;
        }
        var val = rowArray[k];
        var cellTy = this.schema.dataCellTyStr;
        if (val.indexOf('$') != -1) {
            if (this.isDataNumberCell(val)) {
                val = val.replace('$', '');
                cellTy = this.schema.dataCellTyNum;
            }
        }
        var cellOpen = allBold ? this.schema.boldCell : this.schema.dataCell;
        thisXML += cellOpen + cellTy + val + this.schema.dataClose + this.schema.cellClose;
    }
    return thisXML + this.schema.rowClose;
};
/**
 * Return true/false if the value is a number only
 * or if its a string with number contents
 * @param {String} val
 * @return {Boolean} True/False
 * @author eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype.isDataNumberCell = function (val) {
    if (!eo.js.hasNumbers(val)) {
        return false;
    } else {
        if (String(parseFloat(val)).length == String(val).length) {
            return true;
        }
    }
    return false;
};

/**
 * Calculates and returns the Current and YTD rows for
 * the Budget Summary and Budget vs Actual Reports
 * @param {Object} config, {Object} ytdResults
 * @return {Object} row
 * @author eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype._getBudgetVsActualPORow = function (accoGroup, ytdResults, budgetResults, currentResults) {
    var row = {};
    var ytdAccounts = eo.js.findArray(ytdResults, 'accnum', accoGroup.key);
    row.ytdamount = parseFloat(eo.js.sumArray(ytdAccounts, 'amount'));
    var openPoAccounts = eo.js.findArray(currentResults, 'accnum', accoGroup.key);
    row.openpoamount = parseFloat(eo.js.sumArray(openPoAccounts, 'openpoamount'));
    //Find the committed amount
    row.committedamount = parseFloat(row.ytdamount) + parseFloat(row.openpoamount);
    row.acconame = accoGroup.key + ' - ' + accoGroup.altKey;
    //Find YTD Row Amounts (per Account)
    var ytdBudgets = eo.js.findArray(budgetResults, 'accnum', accoGroup.key);
    row.ytdbudget = parseFloat(eo.js.sumArray(ytdBudgets, 'amount'));
    //Calculate Variance
    // row.variance = parseFloat(row.ytdbudget) - parseFloat(row.committedamount);
    //rf 7-5-2017 to change calculation 
    row.variance = parseFloat(row.committedamount) - parseFloat(row.ytdbudget);
    return row;
};

/**
 * Calculates and returns the Current and YTD rows for
 * the Budget Summary and Budget vs Actual Reports
 * @param {Object} config, {Object} budgetResults
 * @return {Object} row
 * @author eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype._getCurrentAndYTDRow = function (accoGroup, currentResults, budgetResults, ytdResults) {
    var row = {};
    //Find the actual amount for the current period
    var currentAccounts = eo.js.findArray(currentResults, 'accnum', accoGroup.key);
    row.currentamount = parseFloat(eo.js.sumArray(eo.js.findArray(currentAccounts, 'fiscalperiod', this.currentperiodId), 'amount'));

    var ytdAccounts = eo.js.findArray(ytdResults, 'accnum', accoGroup.key);
    row.ytdamount = parseFloat(eo.js.sumArray(ytdAccounts, 'amount'));
    //Find the budget and current amount for the first fiscal period
    var budgetAccounts = eo.js.findArray(budgetResults, 'fiscalperiod', this.currentperiodId);
    row.currentbudget = parseFloat(eo.js.sumArray(eo.js.findArray(budgetAccounts, 'accnum', accoGroup.key), 'amount'));
    //Find the variance
    row.currentvariance = parseFloat(row.currentamount) - parseFloat(row.currentbudget);
    row.currentpercent = eo.js.toPercent(row.currentamount, row.currentbudget);
    //Find YTD Row Amounts (per Account)
    var ytdBudgets = eo.js.findArray(budgetResults, 'accnum', accoGroup.key);
    row.ytdbudget = parseFloat(eo.js.sumArray(ytdBudgets, 'amount'));

    row.ytdvariance = parseFloat(row.ytdamount) - parseFloat(row.ytdbudget);
    //row.ytdpercent = eo.js.toPercent(row.ytdvariance, row.ytdbudget);
    row.ytdpercent = eo.js.toPercent(row.ytdamount, row.ytdbudget);
    row.acconame = accoGroup.key + ' - ' + accoGroup.altKey;
    return row;
};

/**
 * Returns an object containing all the Budget Summary and Budget vs Actual PO
 * Reports.
 * @param {Object} config, {Object} accoTypes, {Boolean} isXML, {Boolean} isSummary
 * @return {Object} report
 * @author eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype._getBudgetReportsObject = function (config, accoTypes, isXML, isSummary) {
    var arr = [];
    for (var k = 0; k < accoTypes.length; k++) {
        arr.push(accoTypes[k].key);
        for (var m = 0; m < accoTypes[k].values.length; m++) {
            arr.push(config.rowsjson.map(function (elem) {
                if (elem != 'acconame') {
                    return eo.js.toDollarCurrency(accoTypes[k].values[m][elem], isSummary);
                } else {
                    return accoTypes[k].values[m][elem];
                }
            }));
        }
        arr.push(this._getCurrentAndYTDTotals(accoTypes[k], isSummary));
    }
    return {
        id: config.repid,
        name: config.repname,
        xlsname: config.xlsname,
        header: this._getBudgetVsActualHeader(config, isXML),
        rows: arr,
        grandTotal: this._getCurrentAndYTDGrandTotals(accoTypes, isSummary)
    };
};
/**
 * @param {Object} config, {Boolean} isXML
 * @return {Object} report
 * @author eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype._getBudgetVsActualHeader = function (config, isXML) {
    var header = [];
    // Set Report Header
    for (var p = 0; p < config.coljson.length; p++) {
        var col = config.coljson[p];
        if (col.indexOf('{') != -1) {
            if (col.split('{').length >= 3) {
                if (this.hasOwnProperty(col.split('{')[1].split('}')[0]) && this.hasOwnProperty(col.split('{')[2].split('}')[0])) {
                    col = col.replace(RegExp('{' + (col.split('{')[1].split('}')[0]) + '}', 'g'), this[col.split('{')[1].split('}')[0]]).replace(RegExp('{' + (col.split('{')[2].split('}')[0]) + '}', 'g'), this[col.split('{')[2].split('}')[0]]);
                }
            } else {
                if (this.hasOwnProperty(col.split('{')[1].split('}')[0])) {
                    col = col.replace(RegExp('{' + (col.split('{')[1].split('}')[0]) + '}', 'g'), this[col.split('{')[1].split('}')[0]]);
                }
            }
        }
        header.push(isXML ? this.schema.cellHeader + col + this.schema.cellFooter : col);
    }
    if (isXML) {
        header.push(this.schema.rowFooter);
        header.unshift(this.schema.rowHeaderBold);
    }
    return header;
};
/**
 * Calculates and returns the Current and YTD Totals
 * for the Budget Sumary and Budget vs Actual PO Reports
 * @param {Object} accoTypes, {Boolean} isSummary
 * @return {Object} row
 * @author eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype._getCurrentAndYTDTotals = function (accoTypes, isSummary) {
    if (isSummary) {
        var currentamount = eo.js.sumArray(accoTypes.values, 'currentamount');
        var currentbudget = eo.js.sumArray(accoTypes.values, 'currentbudget');
        var currentvariance = parseFloat(currentamount) - parseFloat(currentbudget);
        var ytdamount = eo.js.sumArray(accoTypes.values, 'ytdamount');
        var ytdbudget = eo.js.sumArray(accoTypes.values, 'ytdbudget');
        var ytdvariance = parseFloat(ytdamount) - parseFloat(ytdbudget);
        //Return Row
        //rf change 7-6-2017 from variance / budget to current amout / budget
        return ['Total - ' + accoTypes.key, eo.js.toDollarCurrency(currentamount, true), eo.js.toDollarCurrency(currentbudget, true), eo.js.toPercent(currentamount, currentbudget), eo.js.toDollarCurrency(currentvariance, true), eo.js.toDollarCurrency(ytdamount, true), eo.js.toDollarCurrency(ytdbudget, true), eo.js.toPercent(ytdamount, ytdbudget), eo.js.toDollarCurrency(ytdvariance, true)];
    } else {
        var ytdamount = eo.js.sumArray(accoTypes.values, 'ytdamount');
        var openpoamount = eo.js.sumArray(accoTypes.values, 'openpoamount');
        var ytdbudget = eo.js.sumArray(accoTypes.values, 'ytdbudget');
        var committedamount = parseFloat(ytdamount) + parseFloat(openpoamount);
        var variance = parseFloat(ytdbudget) - parseFloat(committedamount);
        //Return Row
        return ['Total - ' + accoTypes.key, eo.js.toDollarCurrency(ytdamount, true), eo.js.toDollarCurrency(openpoamount, true), eo.js.toDollarCurrency(committedamount, true), eo.js.toDollarCurrency(ytdbudget, true), eo.js.toDollarCurrency(variance, true)];
    }
};

/**
 * Calculates and returns the Current and YTD Grand Totals
 * for the Budget Sumary and Budget vs Actual PO Reports
 * @param {Object} accoTypes, {Boolean} isSummary
 * @return {Object} row
 * @author eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype._getCurrentAndYTDGrandTotals = function (accoTypes, isSummary) {
    var allAccounts = eo.js.ungroupArray(accoTypes);
    if (isSummary) {
        var currentamount = eo.js.sumArray(allAccounts, 'currentamount');
        var currentbudget = eo.js.sumArray(allAccounts, 'currentbudget');
        var currentvariance = parseFloat(currentamount) - parseFloat(currentbudget);
        var ytdamount = eo.js.sumArray(allAccounts, 'ytdamount');
        var ytdbudget = eo.js.sumArray(allAccounts, 'ytdbudget');
        var ytdvariance = parseFloat(ytdamount) - parseFloat(ytdbudget);
        //Return Row
        //return ['Grand Total  ', eo.js.toDollarCurrency(currentamount, true), eo.js.toDollarCurrency(currentbudget, true), eo.js.toPercent(currentvariance, currentbudget), eo.js.toDollarCurrency(currentvariance,         //  true), eo.js.toDollarCurrency(ytdamount, true), eo.js.toDollarCurrency(ytdbudget, true), eo.js.toPercent(ytdvariance, ytdbudget), eo.js.toDollarCurrency(ytdvariance, true)];
        //rf to change calc
        return ['Grand Total  ', eo.js.toDollarCurrency(currentamount, true), eo.js.toDollarCurrency(currentbudget, true), eo.js.toPercent(currentamount, currentbudget), eo.js.toDollarCurrency(currentvariance, true), eo.js.toDollarCurrency(ytdamount, true), eo.js.toDollarCurrency(ytdbudget, true), eo.js.toPercent(ytdamount, ytdbudget), eo.js.toDollarCurrency(ytdvariance, true)];
    } else {
        var ytdamount = eo.js.sumArray(allAccounts, 'ytdamount');
        var openpoamount = eo.js.sumArray(allAccounts, 'openpoamount');
        var ytdbudget = eo.js.sumArray(allAccounts, 'ytdbudget');
        var committedamount = parseFloat(ytdamount) + parseFloat(openpoamount);
        var variance = parseFloat(committedamount) - parseFloat(ytdbudget);
        return ['Grand Total  ', eo.js.toDollarCurrency(ytdamount, true), eo.js.toDollarCurrency(openpoamount, true), eo.js.toDollarCurrency(committedamount, true), eo.js.toDollarCurrency(ytdbudget, true), eo.js.toDollarCurrency(variance, true)];
    }
};

/**
 * Merges transaction, budget and year to date saved search results
 * Used to display all accounts in reports regardless or whether
 * an amount has been posted to them or not.
 * @param {Boolean} isSummary, {Object} currentResults, {Object} budgetResults, {Object} ytdResults
 * @return {Object} allResults
 * @author eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype._getAllAccounts = function (budgetResults, currentResults, ytdResults) {
    var allAccos = [];
    if (budgetResults != null) {
        if (budgetResults.length > 0) {
            var budgetAccounts = eo.js.getGroupKeysArray(eo.js.groupArray(budgetResults, 'accnum', 'account', 'accounttype'));
            allAccos = allAccos.concat(budgetAccounts);
        }
    }
    if (currentResults != null) {
        if (currentResults.length > 0) {
            var currentAccounts = eo.js.getGroupKeysArray(eo.js.groupArray(currentResults, 'accnum', 'account', 'accounttype'));
            allAccos = allAccos.concat(currentAccounts);
        }
    }
    if (ytdResults != null) {
        if (ytdResults.length > 0) {
            var ytdAccos = eo.js.groupArray(ytdResults, 'accnum', 'account', 'accounttype');
            var ytdAccounts = eo.js.getGroupKeysArray(ytdAccos);
            allAccos = allAccos.concat(ytdAccounts);
        }
    }
    if (allAccos.length > 0) {
        var filteredArr = [];
        var accoNums = eo.js.getUniqueArray(allAccos, 'key');
        for (var m = 0; m < accoNums.length; m++) {
            filteredArr.push(eo.js.findObj(allAccos, 'key', accoNums[m]));
        }
        allAccos = filteredArr.sort(function (acco1, acco2) {
            return (parseFloat(acco1.key) - parseFloat(acco2.key));
        });
    }
    return allAccos;
};
/**
 * Consolidate June 2015 and June 2015 A
 * Tag June 2015 period as June 2015 A
 * @param {Object} a
 * @return null
 * @author eolguin@fmtconsultants.com
 */
EO_XMLToXLS.prototype._adjustPeriodChange = function (a) {
    for (var k = 0; k < a.length; k++) {
        if (a[k] != null) {
            if (a[k].length > 0) {
                a[k] = a[k].map(function (elem) {
                    if (elem.hasOwnProperty('fiscalperiod')) {
                        elem.fiscalperiod = elem.fiscalperiod == '62' ? '65' : elem.fiscalperiod;
                        elem.periodname = elem.periodname == 'Jun 2015' ? 'Jun 2015A' : elem.periodname;
                    }
                    return elem;
                });
            }
        }
    }
};

/**
 * Adjusts the parameter time selectors
 * @author : eolguin@fmtconsultants.com
 * @param : {Object} params
 * @return : null
 */
function updatedParamsTimeSelectors(params) {
    var useFYLookup = false;
    if (params != null) {
        if (params.hasOwnProperty('postingperiod')) {
            if (params.postingperiod != null) {
                if (parseFloat(params.postingperiod) == -9 && eo.js.isNumber(params.year)) {
                    useFYLookup = true;
                } else {
                    var postingPeriod = getPostingPeriodDropdown();
                    if (postingPeriod.hasOwnProperty(params.postingperiod)) {
                        params.ppname = postingPeriod[params.postingperiod].text;
                    }
                }

            }
        }
    }
    nlapiLogExecution('DEBUG', 'Updated Params', JSON.stringify(params));
}

/**
 * Emulates NetSuite Posting Period Filter Dropdown
 * Function returns an array of objects containing transaction
 * posting period filters
 * @author: eolguin@fmtconsultants.com
 * @param : {String} toFind
 * @return : {Object} postingperiods
 */
function getPostingPeriodDropdown(toFind) {
    var postingPeriods = {
        "LFY": {
            value: "LFY",
            text: "Last Fiscal Year"
        },
        "LFYTP": {
            value: "LFYTP",
            text: "Last Fiscal Year to Period"
        },
        "LP": {
            value: "LP",
            text: "Last Period"
        },
        "LQ": {
            value: "LQ",
            text: "Last Fiscal Quarter"
        },
        "LFQTP": {
            value: "LFQTP",
            text: "Last Fiscal Quarter to Period"
        },
        "TFY": {
            value: "TFY",
            text: "This Fiscal Year"
        },
        "TFYTP": {
            value: "TFYTP",
            text: "This Fiscal Year to Period"
        },
        "TP": {
            value: "TP",
            text: "This Period"
        },
        "TPOLFY": {
            value: "TPOLFY",
            text: "Same Period Last FY"
        },
        "TPOLQ": {
            value: "TPOLQ",
            text: "Same Period Last Fiscal Quarter"
        },
        "TQ": {
            value: "TQ",
            text: "This Fiscal Quarter"
        },
        "TFQTP": {
            value: "TFQTP",
            text: "This Fiscal Quarter to Period"
        },
        "TQOLFY": {
            value: "TQOLFY",
            text: "Same Fiscal Quarter Last FY"
        },
        "TFQOLFYTP": {
            value: "TFQOLFYTP",
            text: "Same Fiscal Quarter Last FY to Period"
        },
        "LPOLFY": {
            value: "LPOLFY",
            text: "Last Period One Fiscal Year Ago"
        },
        "LPOLQ": {
            value: "LPOLQ",
            text: "Last Period One Fiscal Quarter Ago"
        },
        "LQOLFY": {
            value: "LQOLFY",
            text: "Last Fiscal Quarter One Fiscal Year Ago"
        },
        "FYBL": {
            value: "FYBL",
            text: "Fiscal Year Before Last"
        },
        "PBL": {
            value: "PBL",
            text: "Period Before Last"
        },
        "QBL": {
            value: "QBL",
            text: "Fiscal Quarter Before Last"
        },
        "Q1TFY": {
            value: "Q1TFY",
            text: "First Fiscal Quarter This FY"
        },
        "Q2TFY": {
            value: "Q2TFY",
            text: "Second Fiscal Quarter This FY"
        },
        "Q3TFY": {
            value: "Q3TFY",
            text: "Third Fiscal Quarter This FY"
        },
        "Q4TFY": {
            value: "Q4TFY",
            text: "Fourth Fiscal Quarter This FY"
        },
        "Q1LFY": {
            value: "Q1LFY",
            text: "First Fiscal Quarter Last FY"
        },
        "Q2LFY": {
            value: "Q2LFY",
            text: "Second Fiscal Quarter Last FY"
        },
        "Q3LFY": {
            value: "Q3LFY",
            text: "Third Fiscal Quarter Last FY"
        },
        "Q4LFY": {
            value: "Q4LFY",
            text: "Fourth Fiscal Quarter Last FY"
        },
        "LR18FP": {
            value: "LR18FP",
            text: "Last Rolling 18 Periods"
        },
        "LR6FQ": {
            value: "LR6FQ",
            text: "Last Rolling 6 Fiscal Quarters"
        }
    };
    return (typeof toFind == 'undefined' || toFind == null) ? postingPeriods : postingPeriods[toFind];
}

/**
 * Gets the start date from the accounting period
 * @param  {[string]} stAccountingPeriodId
 * @return {[string]} start date
 */
function getDateFromAccPeriod(stAccountingPeriodId) {
    if (!stAccountingPeriodId)
        return '';

    return nlapiLookupField('accountingperiod', stAccountingPeriodId, 'startdate');
}

/**
 * Gets the fiscal year from array of accounting periods
 * @param  {[array]} accountingPeriodsIds
 * @return {[string]} fiscal year
 */
function getFiscalYear(accountingPeriodsIds) {
    if (!accountingPeriodsIds || accountingPeriodsIds.length < 1)
        return ('FY ' + new Date().getFullYear());

    // Sort array of accounting periods - from oldest to newest
    var arSortedAccountingPeriods = accountingPeriodsIds.sort(sortNumberArray);

    // Get the date from the newest account period
    var stLastAccPeriodId = arSortedAccountingPeriods[arSortedAccountingPeriods.length - 1];
    var stEndDate = nlapiLookupField('accountingperiod', stLastAccPeriodId, 'enddate');

    // Parse the date and get month and year
    var arParsedDate = stEndDate.split('/');
    var stMonth = arParsedDate[0];
    var intYear = parseInt(arParsedDate[2]);

    // If accounting period is for October/November/December - fiscal year is the next calendar year
    if (parseInt(stMonth) >= 10)
        intYear += 1;

    return "FY " + intYear;
}

/**
 * Custom sorting function for integer numbers
 * @param  {[int]} a - first number
 * @param  {[int]} b - second number
 * @return {[int]} lesser number
 */
function sortNumberArray(a, b) {
    return a - b;
}

/**
 * Removes dollar signs from row object so that the cell can be formatted as numeric
 * @param  {object} row
 * @return {object} row without dollar signs
 */
function removeDollarSigns(row) {
    var rowString = JSON.stringify(row);
    rowString = rowString.replace(/\$/g, '');
    return JSON.parse(rowString);
}