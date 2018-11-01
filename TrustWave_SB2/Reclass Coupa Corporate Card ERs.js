function userEventAfterSubmit(type) 
{
var context = nlapiGetContext();
var recordid = nlapiGetRecordId();
var record = nlapiLoadRecord('expensereport', recordid);
nlapiLogExecution('DEBUG', 'record', recordid);
var smallpurpose = record.getFieldValue('memo');
if (smallpurpose)
{
	var purpose = smallpurpose.toUpperCase();
}
else purpose = '';
nlapiLogExecution('DEBUG', 'Memo', purpose);
var amount = record.getFieldValue('amount');
var employee = record.getFieldValue('entity');
var expense = record.getFieldValue('tranid');
var account = record.getFieldValue('account');
var currency = record.getFieldValue('currency');
var isCorpCard = record.getFieldValue('custbody_is_corp_card');

/*
if ((purpose.indexOf("SHERRILYN ROQUE") >=0 && purpose.indexOf("VISA") >=0) && isCorpCard !='T')
{
//create je
nlapiLogExecution('DEBUG', 'Message', 'Creating JE');
var jeRec = nlapiCreateRecord('journalentry');
jeRec.setFieldValue('subsidiary', 40);
jeRec.setFieldValue('memo', purpose);
jeRec.setFieldValue('approved', 'F');
jeRec.setFieldValue('createdfrom', recordid);
jeRec.setFieldValue('custbody_journal_entry_description', 'Updating Accounts for Corprate Card Employees');
// debit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 296);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'debit', amount);
jeRec.commitLineItem('line');
// credit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 8137);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'credit', amount);
jeRec.commitLineItem('line');
nlapiSubmitRecord(jeRec);
record.setFieldValue('custbody_is_corp_card', 'T');
}
*/

if ((purpose.indexOf("TOM MICHAELIS") >=0 && purpose.indexOf("VISA") >=0) && isCorpCard !='T')
{
//create je
nlapiLogExecution('DEBUG', 'Message', 'Creating JE');
var jeRec = nlapiCreateRecord('journalentry');
jeRec.setFieldValue('subsidiary', 40);
jeRec.setFieldValue('memo', purpose);
jeRec.setFieldValue('approved', 'F');
jeRec.setFieldValue('createdfrom', recordid);
jeRec.setFieldValue('custbody_journal_entry_description', 'Updating Accounts for Corprate Card Employees');
// debit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 296);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'debit', amount);
jeRec.setCurrentLineItemValue('line', 'entity', 154258);
jeRec.commitLineItem('line');
// credit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 8141);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'credit', amount);
jeRec.commitLineItem('line');
nlapiSubmitRecord(jeRec);
record.setFieldValue('custbody_is_corp_card', 'T');
}

if ((purpose.indexOf("JAMES KUNKEL") >=0 && purpose.indexOf("VISA") >=0) && isCorpCard !='T')
{
//create je
nlapiLogExecution('DEBUG', 'Message', 'Creating JE');
var jeRec = nlapiCreateRecord('journalentry');
jeRec.setFieldValue('subsidiary', 1);
jeRec.setFieldValue('memo', purpose);
jeRec.setFieldValue('approved', 'F');
jeRec.setFieldValue('createdfrom', recordid);
jeRec.setFieldValue('custbody_journal_entry_description', 'Updating Accounts for Corprate Card Employees');
// debit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 296);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'debit', amount);
jeRec.setCurrentLineItemValue('line', 'entity', 5734);
jeRec.commitLineItem('line');
// credit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 8138);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'credit', amount);
jeRec.commitLineItem('line');
nlapiSubmitRecord(jeRec);
record.setFieldValue('custbody_is_corp_card', 'T');
}

if ((purpose.indexOf("KRISTYAN MJOLSNES") >=0 && purpose.indexOf("VISA") >=0) && isCorpCard !='T')
{
//create je
nlapiLogExecution('DEBUG', 'Message', 'Creating JE');
var jeRec = nlapiCreateRecord('journalentry');
jeRec.setFieldValue('subsidiary', 40);
jeRec.setFieldValue('memo', purpose);
jeRec.setFieldValue('approved', 'F');
jeRec.setFieldValue('createdfrom', recordid);
jeRec.setFieldValue('custbody_journal_entry_description', 'Updating Accounts for Corprate Card Employees');
// debit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 296);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'debit', amount);
jeRec.setCurrentLineItemValue('line', 'entity', 154262);
jeRec.commitLineItem('line');
// credit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 8140);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'credit', amount);
jeRec.commitLineItem('line');
nlapiSubmitRecord(jeRec);
record.setFieldValue('custbody_is_corp_card', 'T');
}

if ((purpose.indexOf("KEVIN KILRAINE") >=0 && purpose.indexOf("VISA") >=0) && isCorpCard !='T')
{
//create je
nlapiLogExecution('DEBUG', 'Message', 'Creating JE');
var jeRec = nlapiCreateRecord('journalentry');
jeRec.setFieldValue('subsidiary', 1);
jeRec.setFieldValue('memo', purpose);
jeRec.setFieldValue('approved', 'F');
jeRec.setFieldValue('createdfrom', recordid);
jeRec.setFieldValue('custbody_journal_entry_description', 'Updating Accounts for Corprate Card Employees');
// debit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 296);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'debit', amount);
jeRec.setCurrentLineItemValue('line', 'entity', 801360);
jeRec.commitLineItem('line');
// credit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 10937);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'credit', amount);
jeRec.commitLineItem('line');

nlapiSubmitRecord(jeRec);
record.setFieldValue('custbody_is_corp_card', 'T');
}

if ((purpose.indexOf("STEVE KELLEY") >=0 && purpose.indexOf("VISA") >=0) && isCorpCard !='T')
{
//create je
nlapiLogExecution('DEBUG', 'Message', 'Creating JE');
var jeRec = nlapiCreateRecord('journalentry');
jeRec.setFieldValue('subsidiary', 1);
jeRec.setFieldValue('memo', purpose);
jeRec.setFieldValue('approved', 'F');
jeRec.setFieldValue('createdfrom', recordid);
jeRec.setFieldValue('custbody_journal_entry_description', 'Updating Accounts for Corprate Card Employees');
// debit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 296);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'debit', amount);
jeRec.setCurrentLineItemValue('line', 'entity', 117602);
jeRec.commitLineItem('line');
// credit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 8143);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'credit', amount);
jeRec.commitLineItem('line');
nlapiSubmitRecord(jeRec);
record.setFieldValue('custbody_is_corp_card', 'T');
}

if ((purpose.indexOf("MATTHEW WIDMER") >=0 && purpose.indexOf("VISA") >=0) && isCorpCard !='T')
{
//create je
nlapiLogExecution('DEBUG', 'Message', 'Creating JE');
var jeRec = nlapiCreateRecord('journalentry');
jeRec.setFieldValue('subsidiary', 40);
jeRec.setFieldValue('memo', purpose);
jeRec.setFieldValue('approved', 'F');
jeRec.setFieldValue('createdfrom', recordid);
jeRec.setFieldValue('custbody_journal_entry_description', 'Updating Accounts for Corprate Card Employees');
// debit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 296);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'debit', amount);
jeRec.setCurrentLineItemValue('line', 'entity', 154260);
jeRec.commitLineItem('line');
// credit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 8142);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'credit', amount);
jeRec.commitLineItem('line');
nlapiSubmitRecord(jeRec);
record.setFieldValue('custbody_is_corp_card', 'T');
}

if ((purpose.indexOf("IORDAN IORDANOV") >=0 && purpose.indexOf("VISA") >=0) && isCorpCard !='T')
{
//create je
nlapiLogExecution('DEBUG', 'Message', 'Creating JE');
var jeRec = nlapiCreateRecord('journalentry');
jeRec.setFieldValue('subsidiary', 1);
jeRec.setFieldValue('memo', purpose);
jeRec.setFieldValue('approved', 'F');
jeRec.setFieldValue('createdfrom', recordid);
jeRec.setFieldValue('custbody_journal_entry_description', 'Updating Accounts for Corprate Card Employees');
// debit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 296);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'debit', amount);
jeRec.setCurrentLineItemValue('line', 'entity', '-5');
jeRec.commitLineItem('line');
// credit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 8136);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'credit', amount);
jeRec.commitLineItem('line');
nlapiSubmitRecord(jeRec);
record.setFieldValue('custbody_is_corp_card', 'T');
}

if ((purpose.indexOf("JASON SKARIA") >=0 && purpose.indexOf("VISA") >=0) && isCorpCard !='T')
{
//create je
nlapiLogExecution('DEBUG', 'Message', 'Creating JE');
var jeRec = nlapiCreateRecord('journalentry');
jeRec.setFieldValue('subsidiary', 1);
jeRec.setFieldValue('memo', purpose);
jeRec.setFieldValue('approved', 'F');
jeRec.setFieldValue('createdfrom', recordid);
jeRec.setFieldValue('custbody_journal_entry_description', 'Updating Accounts for Corprate Card Employees');
// debit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 296);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'debit', amount);
jeRec.setCurrentLineItemValue('line', 'entity', 396);
jeRec.commitLineItem('line');
// credit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 8139);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'credit', amount);
jeRec.commitLineItem('line');
nlapiSubmitRecord(jeRec);
record.setFieldValue('custbody_is_corp_card', 'T');
}

if ((purpose.indexOf("DELIVERY ASSURANCE") >=0 && purpose.indexOf("VISA") >=0) && isCorpCard !='T')
{
//create je
nlapiLogExecution('DEBUG', 'Message', 'Creating JE');
var jeRec = nlapiCreateRecord('journalentry');
jeRec.setFieldValue('subsidiary', 1);
jeRec.setFieldValue('memo', purpose);
jeRec.setFieldValue('createdfrom', recordid);
jeRec.setFieldValue('approved', 'F');
jeRec.setFieldValue('custbody_journal_entry_description', 'Updating Accounts for Corprate Card Employees');
// debit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 296);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'debit', amount);
jeRec.setCurrentLineItemValue('line', 'entity', 301999);
jeRec.commitLineItem('line');
// credit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 8144);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'credit', amount);
jeRec.commitLineItem('line');
nlapiSubmitRecord(jeRec);
record.setFieldValue('custbody_is_corp_card', 'T');
}

if ((purpose.indexOf("ROBERT MCCULLEN") >=0 && purpose.indexOf("VISA") >=0) && isCorpCard !='T')
{
//create je
nlapiLogExecution('DEBUG', 'Message', 'Creating JE');
var jeRec = nlapiCreateRecord('journalentry');
jeRec.setFieldValue('subsidiary', 1);
jeRec.setFieldValue('memo', purpose);
jeRec.setFieldValue('createdfrom', recordid);
jeRec.setFieldValue('approved', 'F');
jeRec.setFieldValue('custbody_journal_entry_description', 'Updating Accounts for Corprate Card Employees');
// debit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 296);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'debit', amount);
jeRec.setCurrentLineItemValue('line', 'entity', 5448);
jeRec.commitLineItem('line');
// credit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 10936);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'credit', amount);
jeRec.commitLineItem('line');
nlapiSubmitRecord(jeRec);
record.setFieldValue('custbody_is_corp_card', 'T');
}

if ((purpose.indexOf("MICHAEL AMINZADE") >=0 && purpose.indexOf("VISA") >=0) && isCorpCard !='T')
{
//create je
nlapiLogExecution('DEBUG', 'Message', 'Creating JE');
var jeRec = nlapiCreateRecord('journalentry');
jeRec.setFieldValue('subsidiary', 1);
jeRec.setFieldValue('memo', purpose);
jeRec.setFieldValue('createdfrom', recordid);
jeRec.setFieldValue('approved', 'F');
jeRec.setFieldValue('custbody_journal_entry_description', 'Updating Accounts for Corprate Card Employees');
// debit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 296);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'debit', amount);
jeRec.setCurrentLineItemValue('line', 'entity', 812657);
jeRec.commitLineItem('line');
// credit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 11742);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'credit', amount);
jeRec.commitLineItem('line');
nlapiSubmitRecord(jeRec);
record.setFieldValue('custbody_is_corp_card', 'T');
}

if ((purpose.indexOf("BASTIDA") >=0 && purpose.indexOf("VISA") >=0) && isCorpCard !='T')
{
//create je
nlapiLogExecution('DEBUG', 'Message', 'Creating JE');
var jeRec = nlapiCreateRecord('journalentry');
jeRec.setFieldValue('subsidiary', 1);
jeRec.setFieldValue('memo', purpose);
jeRec.setFieldValue('createdfrom', recordid);
jeRec.setFieldValue('approved', 'F');
jeRec.setFieldValue('custbody_journal_entry_description', 'Updating Accounts for Corprate Card Employees');
// debit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 296);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'debit', amount);
jeRec.setCurrentLineItemValue('line', 'entity', 342937);
jeRec.commitLineItem('line');
// credit line
jeRec.selectNewLineItem('line');
jeRec.setCurrentLineItemValue('line', 'account', 12852);
jeRec.setCurrentLineItemValue('line','department', 238);
jeRec.setCurrentLineItemValue('line', 'credit', amount);
jeRec.commitLineItem('line');
nlapiSubmitRecord(jeRec);
record.setFieldValue('custbody_is_corp_card', 'T');
}

nlapiLogExecution('DEBUG', 'Message', 'Creating JE Successful!');
nlapiSubmitRecord(record, true);
}