/*******************************************************************************
 * The following javascript code is created by FMT Consultants LLC,
 * a NetSuite Partner. It is a SuiteFlex component containing custom code
 * intended for NetSuite (www.netsuite.com) and use the SuiteScript API.
 * The code is provided "as is": FMT Consultants LLC shall not be liable
 * for any damages arising out the intended use or if the code is modified
 * after delivery.
 *
 * Company:             FMT Consultants LLC, www.fmtconsultants.com
 * Author:              eolguin@fmtconsultants.com
 * File:                ITG_CUE_SetCCBudgetReports.js
 * Date:                Wednesday March 11th 2015
 * Last Updated:        Wednesday January 27th 2016
 * Version:             1.7
 *
 * Credits to Handsontable.com for jQuery Plugin.
 * http://handsontable.com/
 *
 * Posting Period Vals:
 * Accounting Period --> ID : -7
 * Custom Range --> ID: 0
 * Blank --> -9
 *
 ***********************************************************************/
//No conflict line.
jQuery.noConflict();
/**
 * Disables the on or before date field and from/to fields
 * @param : null
 * @return : null
 * @author : elean.olguin@gmail.com, eolguin@fmtconsultants.com
 */
jQuery(document).ready(function () {
    if (nlapiGetFieldValue('custpage_isnores') == 'T') {
        var ccMulti = nlapiGetField('custpage_fmt_reports_costcentermulti');
        ccMulti.setDisplayType('hidden');
    }
});
//Constants
var ITG_CLCCBDGT = {
    FLDS: 'custpage_fmt_reports_',
    POST_MAP: ['select', 'costcenter', 'costcentermulti', 'year', 'postingperiod', 'date', 'ppfrom', 'ppto', 'allcc'],
    DATE_FILTERS: ['custpage_fmt_reports_year', 'custpage_fmt_reports_postingperiod', 'custpage_fmt_reports_date'],
    SS_SCRIPT_ID: 'customscript_loec_ssu_setreportspage',
    SS_SCRIPT_DEPLOYMENT: 'customdeploy_loec_ssu_setreportspage'
};
var g_alreadySet = false;
var g_alreadyExecuted = false;
var g_selectorsReset = false;
/**
 * OnFieldChanged, select/deselect all reports when user clicks
 * on Select All checkbox
 * @param : {String} type, {String} name, {String} linenum
 * @return : null
 * @author : elean.olguin@gmail.com, eolguin@fmtconsultants.com
 */
function onFieldChanged_selectReports(type, name, linenum) {

    if (name == 'custpage_fmt_reports_date') {
        //If on or before date is selected, clear all date fields
        var onBefDate = String(nlapiGetFieldValue('custpage_fmt_reports_date'));
        if (onBefDate.length >= 3) {
            //Clear Values
            nlapiRemoveSelectOption('custpage_fmt_reports_ppfrom', null);
            nlapiRemoveSelectOption('custpage_fmt_reports_ppto', null);
            nlapiInsertSelectOption('custpage_fmt_reports_ppfrom', ' ', ' ', true);
            nlapiInsertSelectOption('custpage_fmt_reports_ppto', ' ', ' ', true);
            //Remove Mandatory
            nlapiSetFieldMandatory('custpage_fmt_reports_ppfrom', false);
            nlapiSetFieldMandatory('custpage_fmt_reports_ppto', false);
            //Disable
            nlapiSetFieldDisabled('custpage_fmt_reports_ppfrom', true);
            nlapiSetFieldDisabled('custpage_fmt_reports_ppto', true);
        }
    }

    //Enable field only for PO report
    if (name == 'custpage_fmt_reports_select') {
        if (parseInt(nlapiGetFieldValue('custpage_fmt_reports_select')) == 3) {
            nlapiSetFieldDisabled('custpage_fmt_reports_date', false);
        } else {
            nlapiSetFieldValue('custpage_fmt_reports_date', '');
            nlapiSetFieldDisabled('custpage_fmt_reports_date', true);
        }
    }
    if (name == 'custpage_fmt_reports_year') {
        nlapiSetFieldValue('custpage_fmt_reports_date', '');
        if (g_alreadyExecuted) {
            g_alreadyExecuted = false;
            return;
        } else {
            var thisYear = nlapiGetFieldValue('custpage_fmt_reports_year');
            var thisFY = nlapiGetFieldValue('custpage_fmt_reports_thisfy');
            var period = parseInt(nlapiGetFieldValue('custpage_fmt_reports_postingperiod'));
            if (thisYear == 'all') {
                var parsedPeriod = !isNaN(parseInt(period)) ? '' : String(period);
                if (parsedPeriod.length >= 2) {
                    nlapiSetFieldValue('custpage_fmt_reports_postingperiod', '-9', false, false);
                }
                filterAccountingPeriodsByFY(thisYear);
                return;
            }
            if (!isNaN(parseInt(thisYear) || thisYear == 'ADJUSTED')) {
                period = parseInt(period);
                if (thisYear == thisFY) {
                    if (period == 0 || period == -7) {
                        return;
                    } else {
                        nlapiSetFieldValue('custpage_fmt_reports_postingperiod', '-9', false, false);
                    }
                } else {
                    var period = parseInt(nlapiGetFieldValue('custpage_fmt_reports_postingperiod'));
                    var parsedPeriod = !isNaN(parseInt(period)) ? '' : String(period);
                    if (parsedPeriod.length >= 2 && (period != 0 || period != -7 || period != -9)) {
                        nlapiSetFieldValue('custpage_fmt_reports_postingperiod', '-9', false, false);
                    }
                }
                filterAccountingPeriodsByFY(thisYear);
            }
        }
    }
    //Set the time selector ranges
    if (name == 'custpage_fmt_reports_postingperiod') {
        nlapiSetFieldValue('custpage_fmt_reports_date', '');
        onPostingPeriodChange();
    }
    //Set Select All/Cost Center Selection Interactions
    if (name == 'custpage_fmt_reports_selectall') {
        onSelectAllReportsChange();
    }
    if (nlapiGetFieldValue('custpage_isnores') == 'T') {
        if (name == 'custpage_fmt_reports_showall') {
            nlapiSetFieldValue('custpage_fmt_reports_costcentermulti', '');
            nlapiSetFieldValue('custpage_fmt_reports_costcenter', '');
            onShowAllCostCentersChange();
        }
        if (name == 'custpage_fmt_reports_allcc') {
            nlapiSetFieldValue('custpage_fmt_reports_costcentermulti', '');
            nlapiSetFieldValue('custpage_fmt_reports_costcenter', '');
            onSelectAllCostCentersChange();
        }
    }
}

/**
 * @param : {String} type, {String} name, {String} lineno
 * @return : null
 * @author : elean.olguin@gmail.com
 */
function onValidateField_blockPeriodSelection(type, name, lineno) {
    if (name == 'custpage_fmt_reports_postingperiod') {
        var thisYear = nlapiGetFieldValue('custpage_fmt_reports_year');
        var thisFY = nlapiGetFieldValue('custpage_fmt_reports_thisfy');
        var period = nlapiGetFieldValue('custpage_fmt_reports_postingperiod');
        if (parseInt(period) == -7) {
            nlapiSetFieldValue('custpage_fmt_reports_ppto', '');
            nlapiSetFieldDisabled('custpage_fmt_reports_ppto', true);
        }
        period = !isNaN(parseInt(period)) ? '' : String(period);
        if (period.length >= 2 && thisFY != thisYear) {
            return false;
        }
    }
    return true;
}

/**
 * @param : null
 * @return : null
 * @author : elean.olguin@gmail.com
 */
function onPostingPeriodChange() {
    var thisReset = true;
    var period = nlapiGetFieldValue('custpage_fmt_reports_postingperiod');
    var parsedPeriod = !isNaN(parseInt(period)) ? '' : String(period);
    var thisYear = nlapiGetFieldValue('custpage_fmt_reports_year');
    if (parsedPeriod.length >= 2) {
        var thisFY = nlapiGetFieldValue('custpage_fmt_reports_thisfy');
        if (thisYear != thisFY) {
            nlapiSetFieldValue('custpage_fmt_reports_year', thisFY);
            g_alreadyExecuted = true;
        }
        setReportsTimeSelectors(thisFY, period);
        g_selectorsReset = true;
        thisReset = false;
        //Remove disable
        nlapiSetFieldDisabled('custpage_fmt_reports_ppfrom', false);
        nlapiSetFieldDisabled('custpage_fmt_reports_ppto', false);
    } else {
        period = parseInt(period);
        if (!isNaN(period)) {
            if (isNaN(parseInt(thisYear))) {
                nlapiSetFieldValue('custpage_fmt_reports_year', 'all');
            }
            //If blank
            if (period == -9) {
                //Clear Values
                nlapiSetFieldValue('custpage_fmt_reports_date', '');
                nlapiRemoveSelectOption('custpage_fmt_reports_ppfrom', null);
                nlapiRemoveSelectOption('custpage_fmt_reports_ppto', null);
                nlapiInsertSelectOption('custpage_fmt_reports_ppfrom', ' ', ' ', true);
                nlapiInsertSelectOption('custpage_fmt_reports_ppto', ' ', ' ', true);
                //Remove Mandatory
                nlapiSetFieldMandatory('custpage_fmt_reports_ppfrom', false);
                nlapiSetFieldMandatory('custpage_fmt_reports_ppto', false);
                //Disable
                nlapiSetFieldDisabled('custpage_fmt_reports_ppfrom', true);
                nlapiSetFieldDisabled('custpage_fmt_reports_ppto', true);
                if (thisReset) {
                    g_selectorsReset = true;
                    thisReset = true;
                }
            }
            //If Custom Range
            if (period == 0) {
                //Clear Values
                nlapiSetFieldValue('custpage_fmt_reports_date', '');
                nlapiSetFieldValue('custpage_fmt_reports_ppfrom', '');
                nlapiSetFieldValue('custpage_fmt_reports_ppto', '');
                //Set Mandatory
                nlapiSetFieldMandatory('custpage_fmt_reports_ppfrom', true);
                nlapiSetFieldMandatory('custpage_fmt_reports_ppto', true);
                //Remove disable
                nlapiSetFieldDisabled('custpage_fmt_reports_ppfrom', false);
                nlapiSetFieldDisabled('custpage_fmt_reports_ppto', false);
            }
            //If accounting period
            if (period == -7) {
                nlapiSetFieldValue('custpage_fmt_reports_date', '');
                //Set/Unset Mandatory
                nlapiSetFieldMandatory('custpage_fmt_reports_ppfrom', true);
                nlapiSetFieldMandatory('custpage_fmt_reports_ppto', false);
                //Remove/Set disable
                nlapiSetFieldDisabled('custpage_fmt_reports_ppfrom', false);
                nlapiSetFieldDisabled('custpage_fmt_reports_ppto', true);
                //Clear Values
                nlapiSetFieldValue('custpage_fmt_reports_ppto', '');

            }
        }
    }
    if (thisReset && g_selectorsReset && !isNaN(parseInt(thisYear)) || (thisYear == 'ADJUSTED' || thisYear == 'all')) {
        nlapiSetFieldValue('custpage_fmt_reports_year', thisYear);
        filterAccountingPeriodsByFY(thisYear);
        g_selectorsReset = false;
    }
}

/**
 * @param : {String} thisYear, {String} period
 * @return : null
 * @author : elean.olguin@gmail.com
 */
function setReportsTimeSelectors(thisYear, period) {
    try {
        var url = nlapiResolveURL('SUITELET', ITG_CLCCBDGT.SS_SCRIPT_ID, ITG_CLCCBDGT.SS_SCRIPT_DEPLOYMENT);
        url += '&istimesel=T' + '&year=' + thisYear + '&postingperiod=' + period;
        var response = nlapiRequestURL(url, null, "application/json", null, 'POST');
        if (response) {
            var bodyRes = response.getBody();
            if (bodyRes != null) {
                var ppVal = JSON.parse(bodyRes);
                if (ppVal instanceof Array) {
                    var ppFrom = ppVal[0];
                    var ppTo = (ppVal.length == 2) ? ppVal[1] : ppFrom;
                    nlapiRemoveSelectOption('custpage_fmt_reports_ppfrom', null);
                    nlapiRemoveSelectOption('custpage_fmt_reports_ppto', null);
                    nlapiInsertSelectOption('custpage_fmt_reports_ppfrom', ' ', ' ', true);
                    nlapiInsertSelectOption('custpage_fmt_reports_ppto', ' ', ' ', true);
                    nlapiInsertSelectOption('custpage_fmt_reports_ppfrom', ppFrom.internalid, ppFrom.periodname, true);
                    nlapiInsertSelectOption('custpage_fmt_reports_ppto', ppTo.internalid, ppTo.periodname, true);
                }
            }
        }

    } catch (e) {
    }
}

/**
 * @param : {String} thisYear
 * @return : null
 * @author : elean.olguin@gmail.com
 */
function filterAccountingPeriodsByFY(thisYear) {
    try {
        var url = nlapiResolveURL('SUITELET', ITG_CLCCBDGT.SS_SCRIPT_ID, ITG_CLCCBDGT.SS_SCRIPT_DEPLOYMENT);
        url += '&isfycall=T' + '&year=' + thisYear;
        var response = nlapiRequestURL(url, null, "application/json", null, 'POST');
        if (response) {
            var bodyRes = response.getBody();
            if (bodyRes != null) {
                var ppVal = JSON.parse(bodyRes);
                if (ppVal instanceof Object) {
                    nlapiRemoveSelectOption('custpage_fmt_reports_ppfrom', null);
                    nlapiRemoveSelectOption('custpage_fmt_reports_ppto', null);
                    nlapiInsertSelectOption('custpage_fmt_reports_ppfrom', ' ', ' ', true);
                    nlapiInsertSelectOption('custpage_fmt_reports_ppto', ' ', ' ', true);
                    for (var k = 0; k < ppVal.length; k++) {
                        var ppFromVal = ppVal[k].hasOwnProperty('value') ? pplVal[k].value : ppVal[k].internalid;
                        var ppFromText = ppVal[k].hasOwnProperty('text') ? pplVal[k].text : ppVal[k].periodname;
                        nlapiInsertSelectOption('custpage_fmt_reports_ppfrom', ppFromVal, ppFromText, false);
                        nlapiInsertSelectOption('custpage_fmt_reports_ppto', ppFromVal, ppFromText, false);
                    }
                }
            }
        }
    } catch (e) {
        nlapiLogExecution('ERROR', 'filterAccountingPeriodsByFY', e);
    }
}

/**
 * @param : null
 * @return : null
 * @author : elean.olguin@gmail.com, eolguin@fmtconsultants.com
 */
function onSelectAllCostCentersChange() {
    var allCC = nlapiGetFieldValue('custpage_fmt_reports_allcc');
    var ccMulti = nlapiGetField('custpage_fmt_reports_costcentermulti');
    var ccSel = nlapiGetField('custpage_fmt_reports_costcenter');
    var showAll = nlapiGetFieldValue('custpage_fmt_reports_showall');
    if (allCC == 'T') {
        ccSel.setDisplayType('hidden');
        nlapiSetFieldMandatory('custpage_fmt_reports_costcenter', false);
        ccMulti.setDisplayType('normal');
        nlapiSetFieldDisabled('custpage_fmt_reports_costcentermulti', true);
        nlapiSetFieldMandatory('custpage_fmt_reports_costcentermulti', false);
    } else {
        if (showAll != 'T') {
            var ccSel = nlapiGetField('custpage_fmt_reports_costcenter');
            ccSel.setDisplayType('normal');
            ccMulti.setDisplayType('hidden');
            nlapiSetFieldDisabled('custpage_fmt_reports_costcenter', false);
            nlapiSetFieldMandatory('custpage_fmt_reports_costcenter', true);
            nlapiSetFieldDisabled('custpage_fmt_reports_costcentermulti', true);
            nlapiSetFieldMandatory('custpage_fmt_reports_costcentermulti', false);
        } else {
            nlapiSetFieldDisabled('custpage_fmt_reports_costcentermulti', false);
            nlapiSetFieldMandatory('custpage_fmt_reports_costcentermulti', true);
        }
    }
}

/**
 * @param : null
 * @return : null
 * @author : elean.olguin@gmail.com, eolguin@fmtconsultants.com
 */
function onSelectAllReportsChange() {
    var selectALL = nlapiGetFieldValue('custpage_fmt_reports_selectall');
    if (selectALL == 'T') {
        nlapiSetFieldValues('custpage_fmt_reports_select', ['1', '2', '3', '4']);
        for (var k = 0; k < ITG_CLCCBDGT.DATE_FILTERS.length; k++) {
            if (k == 2) {
                nlapiSetFieldValue(ITG_CLCCBDGT.DATE_FILTERS[k], '');
                nlapiSetFieldDisabled(ITG_CLCCBDGT.DATE_FILTERS[k], true);
            } else {
                nlapiSetFieldDisabled(ITG_CLCCBDGT.DATE_FILTERS[k], false);
            }
        }
    } else if (selectALL == 'F') {
        nlapiSetFieldValues('custpage_fmt_reports_select', ['']);
        for (var k = 0; k < ITG_CLCCBDGT.DATE_FILTERS.length; k++) {
            if (k == 2) {
                nlapiSetFieldValue(ITG_CLCCBDGT.DATE_FILTERS[k], '');
                nlapiSetFieldDisabled(ITG_CLCCBDGT.DATE_FILTERS[k], true);
            } else {
                nlapiSetFieldDisabled(ITG_CLCCBDGT.DATE_FILTERS[k], false);
            }
        }
    }
}

/**
 * @param : null
 * @return : null
 * @author : elean.olguin@gmail.com, eolguin@fmtconsultants.com
 */
function onShowAllCostCentersChange() {
    var showAll = nlapiGetFieldValue('custpage_fmt_reports_showall');
    var ccSel = nlapiGetField('custpage_fmt_reports_costcenter');
    var ccMulti = nlapiGetField('custpage_fmt_reports_costcentermulti');
    var allCC = nlapiGetField('custpage_fmt_reports_allcc');
    if (showAll == 'T') {
        allCC.setDisplayType('normal');
        nlapiSetFieldMandatory('custpage_fmt_reports_costcenter', false);
        ccSel.setDisplayType('hidden');
        ccMulti.setDisplayType('normal');
        nlapiSetFieldMandatory('custpage_fmt_reports_costcentermulti', true);
    } else {
        allCC.setDisplayType('hidden');
        ccSel.setDisplayType('normal');
        nlapiSetFieldMandatory('custpage_fmt_reports_costcenter', true);
        ccMulti.setDisplayType('hidden');
        nlapiSetFieldMandatory('custpage_fmt_reports_costcentermulti', false);
    }
}

/**
 * Validates all required fields
 * @param : {Boolean} isEmail
 * @return : null
 * @author : elean.olguin@gmail.com, eolguin@fmtconsultants.com
 */
function usrSubmitIsValid(isEmail) {
    var y = nlapiGetFieldValue('custpage_fmt_reports_year');
    y = y == 'ADJUSTED' ? 1 : parseInt(y);
    var p = parseInt(nlapiGetFieldValue('custpage_fmt_reports_postingperiod'));
    var f = parseInt(nlapiGetFieldValue('custpage_fmt_reports_ppfrom'));
    var t = parseInt(nlapiGetFieldValue('custpage_fmt_reports_ppto'));
    var d = nlapiGetFieldValue('custpage_fmt_reports_date');
    var n = nlapiGetFieldValue('custpage_isnores');
    var allCC = (n == 'T') ? nlapiGetFieldValue('custpage_fmt_reports_allcc') : 'F';
    var showAll = (n == 'T') ? nlapiGetFieldValue('custpage_fmt_reports_showall') : 'F';
    var cc = (showAll == 'T') ? nlapiGetFieldValues('custpage_fmt_reports_costcentermulti') : parseFloat(nlapiGetFieldValue('custpage_fmt_reports_costcenter'));
    var r = nlapiGetFieldValues('custpage_fmt_reports_select');
    if (r.length == 0) {
        alert('Please select a report!');
        return false;
    }
    if (!isEmail && (allCC == 'T' || showAll == 'T')) {
        alert('Downloading and previewing of multiple Cost Center Reports is not available at the moment. Please go back and click on the Email Report(s) button instead.');
        return false;
    } else if (((isNaN(cc) && allCC == 'T') || (!isNaN(cc) && allCC == 'F')) && !isNaN(y) || (d != null && d != '')) {
        return true;
    } else if (((isNaN(cc) && allCC == 'T') || (!isNaN(cc) && allCC == 'F')) && p == 0 && !isNaN(f) && !isNaN(t)) {
        return true;
    } else if (((isNaN(cc) && allCC == 'T') || (!isNaN(cc) && allCC == 'F')) && isNaN(y) && (isNaN(p) || p == -9) && isNaN(f) && isNaN(y) && (d == null || d == '')) {
        alert('Please select an Accounting Period or a Fiscal Year!');
        return false;
    } else if (((isNaN(cc) && allCC == 'T') || (!isNaN(cc) && allCC == 'F')) && p == -7 && isNaN(f) && isNaN(y) && (d == null || d == '')) {
        alert('Please select an Accounting Period!');
        return false;
    } else if (((isNaN(cc) && allCC == 'T') || (!isNaN(cc) && allCC == 'F')) && p == 0 && (isNaN(f) || isNaN(t))) {
        alert('Please select a valid From/To Accounting Period Range!');
        return false;
    }
    if (isNaN(cc) && n == 'T' && showAll == 'F' && allCC != 'T') {
        alert('Please select a Cost Center!');
        return false;
    } else if (cc.length <= 1 && n == 'T' && showAll == 'T' && allCC != 'T') {
        alert('Please select a Cost Center!');
        return false;
    }
    return true;
}

/**
 * Redirects the submission to a Suitelet
 * Creates a POST request via Ajax
 * @param : null
 * @return : null
 * @author : elean.olguin@gmail.com, eolguin@fmtconsultants.com
 */
function emailCSVReport() {
    if (usrSubmitIsValid(true)) {
        var params = getReportsPageParams(ITG_CLCCBDGT.FLDS, ITG_CLCCBDGT.POST_MAP, true);
        if (params != null) {
            if (nlapiGetFieldValue('custpage_fmt_reports_showemail') == 'T') {
                return openEmailPopupRedir();
            } else {
                try {
                    var form = jQuery('#main_form');
                    if (form != null) {
                        form.submit(jQuery.proxy(function () {
                            var e = this.attr('action');
                            jQuery.ajax({
                                type: 'POST',
                                url: e,
                                data: this.serialize(),
                                beforeSend: function () {
                                    if (!g_alreadySet) {
                                        nlapiSetFieldValue('custpage_jsonobject', JSON.stringify(params));
                                        nlapiSetFieldValue('custpage_issubmit', 'T');
                                        g_alreadySet = true;
                                    }
                                }
                            });
                        }, form));
                        form.submit();
                    } else {
                        alert('An unexpected error has ocurred. Please contact your NetSuite Administrator.');
                    }
                } catch (e) {
                    alert('An unexpected error has ocurred. Please try again later or contact your NetSuite Administrator.');
                    nlapiLogExecution('ERROR', '[FMT] emailCSVReport error', e);
                }
            }

        } else {
            alert('You must select at least one report to submit this request.');
        }
    }
}

/**
 * Redirects the submission to a Suitelet Email Window popup form
 * @param : null
 * @return : null
 * @author : elean.olguin@gmail.com, eolguin@fmtconsultants.com
 */
function openEmailPopupRedir() {
    var url = nlapiResolveURL('SUITELET', 'customscript_itg_ssu_sendccreports', 'customdeploy_itg_ssu_sendccreports');
    url += '&iswinpreq=T';
    var params = getReportsPageParams(ITG_CLCCBDGT.FLDS, ITG_CLCCBDGT.POST_MAP, true);
    if (params != null) {
        for (var id in params) {
            if (params.hasOwnProperty(id)) {
                url += '&' + id + '=' + params[id];
            }
        }
    }
    window.changed = false;
    window.open(url, '_blank', 'left=20,top=20,width=1000,height=500,resizable=0');
}

/**
 * Preview Report Using HandsonTable plugin
 * @param : null
 * @return : null
 * @author : elean.olguin@gmail.com, eolguin@fmtconsultants.com
 */
function previewExcelReport() {
    if (usrSubmitIsValid(false)) {
        var reportId = nlapiGetFieldValues('custpage_fmt_reports_select');
        if (reportId.length == 1) {
            var url = nlapiResolveURL('SUITELET', 'customscript_loec_ssu_setreportspage', 'customdeploy_loec_ssu_setreportspage');
            url += '&ispreview=T&select=' + reportId;
            url += '&selname=' + encodeURIComponent(nlapiGetFieldText('custpage_fmt_reports_select'));
            url += '&costcenter=' + nlapiGetFieldValue('custpage_fmt_reports_costcenter');
            url += '&year=' + nlapiGetFieldValue('custpage_fmt_reports_year');
            url += '&postingperiod=' + nlapiGetFieldValue('custpage_fmt_reports_postingperiod');
            url += '&date=' + nlapiGetFieldValue('custpage_fmt_reports_date');
            url += '&ppfrom=' + nlapiGetFieldValue('custpage_fmt_reports_ppfrom');
            url += '&ppto=' + nlapiGetFieldValue('custpage_fmt_reports_ppto');
            window.open(url, '_blank', 'toolbar=0,location=0,menubar=0');
        } else {
            alert('You can only preview one report at a time, please go back and make sure only one report is selected in the Report Name Field.');
            nlapiSetFieldValues('custpage_fmt_reports_select', ['']);
        }
    }
}

/**
 *Refreshes form whenever Clear button is pressed
 * @param : null
 * @return : null
 * @author : elean.olguin@gmail.com, eolguin@fmtconsultants.com
 */
function clearFormFields() {
    window.ischanged = false;
    window.location = nlapiResolveURL('SUITELET', ITG_CLCCBDGT.SS_SCRIPT_ID, ITG_CLCCBDGT.SS_SCRIPT_DEPLOYMENT);
}

/**
 * Get all transactions that were marked as to be payed
 * and set them in an object to be used as parameters
 * Returns body values as well
 * @param : {String} fldName, {Object} fldMap, {Boolean} isEmail
 * @return : {Object} params
 * @author : elean.olguin@gmail.com
 */
function getReportsPageParams(fldName, fldMap, isEmail) {
    var params = {};
    var multiCC = null;
    if (fldName != null && fldMap != null) {
        //Get Body
        for (var p = 0; p < fldMap.length; p++) {
            if (fldMap[p].indexOf('multi') != -1) {
                multiCC = nlapiGetFieldValues(fldName + fldMap[p]);
                multiCC = encodeURIComponent(String(multiCC.join(',')));
            } else {
                if (fldMap[p] == 'select') {
                    params[fldMap[p]] = nlapiGetFieldValues(fldName + fldMap[p]);
                    if (params[fldMap[p]].length == 0) {
                        return null;
                    } else {
                        var val = String(params[fldMap[p]].join(','));
                        params[fldMap[p]] = encodeURIComponent(val);
                    }
                } else {
                    params[fldMap[p]] = encodeURIComponent(parseNull(nlapiGetFieldValue(fldName + fldMap[p])));
                }
            }
        }
    }
    if (multiCC != null && multiCC != '') {
        params.costcenter = multiCC;
    } else {
        if (isNaN(parseFloat(params.costcenter)) && nlapiGetFieldValue('custpage_isnores') == 'T') {
            if (nlapiGetFieldValue('custpage_fmt_reports_allcc') != 'T') {
                return null;
            }
        }
    }
    params.email = isEmail;
    return params;
}

/**
 * Parse null values
 * @param : {String} val
 * @return : {String} val
 * @author : elean.olguin@gmail.com
 */
function parseNull(val) {
    return (val == null || val == '' || val == 'null') ? '' : val;
}