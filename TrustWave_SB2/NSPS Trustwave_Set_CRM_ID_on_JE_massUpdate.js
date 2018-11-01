/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       21 Dec 2015     pkapse
 * 2.00       29 Dec 2015     Chetan Jumani
 */

var COL_FIELD_CRM_ID='custcol_contract_data';
var COL_FIELD_SOURCE_TRANSACTION ='custcol_source_transaction';
var COL_FIELD_SCHEDULE ='schedulenum';
var COL_FIELD_REV_REC_SCHEDULE = 'custcol_rev_rec_schedule';

var SEARCH_REVREC_SOURCE = 'customsearch_rev_rec_schedule_source';


function scheduled_Set_CRMID_on_JE_massupdate(rec_type,rec_id)
{
	var funcName = 'scheduled_Set_CRMID_on_JE_massupdate';
	var recJE ='';
	var k=0;
	var stJEScheduleNumber = ''; 
	var filterExpression = '';
	var arrRevRecSchedfilters = [];
	var arrSchedule = [];
	var tempRevRec = [];
	
	try
	{
		
		
		recJE = nlapiLoadRecord(rec_type,rec_id); 
		var jeLineCount =	recJE.getLineItemCount('line');
		nlapiLogExecution ('AUDIT', funcName, '==================== STARTED ====================rec_type:' + rec_type+'\nrec_id:'+rec_id+' Total JE Lines :'+jeLineCount);
		
		for (var i = 1; i <= jeLineCount ; i++)
		{
			stJEScheduleNumber = recJE.getLineItemValue('line',COL_FIELD_SCHEDULE,i);
			//nlapiLogExecution('DEBUG', funcName,' Schedule Number: ' + stJEScheduleNumber + ' on line :' + i);

			if(!isEmpty(stJEScheduleNumber))
			{
				var stJELineSrcTran = recJE.getLineItemValue('line', COL_FIELD_SOURCE_TRANSACTION,i);
				var stJELineCRMID = recJE.getLineItemValue('line', COL_FIELD_CRM_ID,i);
				//nlapiLogExecution('DEBUG', funcName,' jeLineCount:'+jeLineCount+ ': on line :' + i+':stJELineCRMID: ' + stJELineCRMID  + '\n stJELineSrcTran:  ' + stJELineSrcTran);	
				
				
				// PK Jan 7 2016
				var stRevRecSchedule = recJE.getLineItemValue('line',COL_FIELD_REV_REC_SCHEDULE,i);
				
																		// Jan 7 2016 PK added the Rev Rec Schedule check	
				if (isEmpty(stJELineSrcTran) || isEmpty(stJELineCRMID) || isEmpty(stRevRecSchedule))
				{
					tempRevRec[k] = stJEScheduleNumber;  // array index 0,1,....
					k++;
					nlapiLogExecution('DEBUG', funcName,'stJEScheduleNumber '+stJEScheduleNumber+ ' added to the array' )
		 
				}
			}
		}// end of For loop to collect Rev Rec schedules in an array
		
		nlapiLogExecution('DEBUG', funcName,'tempRevRec.length='+tempRevRec.length);
		
		if(tempRevRec.length==0)
		{
			var stInterCompanyJE = nlapiGetFieldValue('icj');
			
			if ('T' == stInterCompanyJE )
			{
				nlapiSubmitField('intercompanyjournalentry',rec_id,'custbody_je_processed', 'T');
			}
			else
			{
				nlapiSubmitField(rec_type,rec_id,'custbody_je_processed', 'T');
			}

			//nlapiLogExecution('DEBUG', funcName,'There are no Revenue Schedules on the JE lines. Updating the processed flag  for updJEId:'+rec_id + ' Exiting Script==========================');
			nlapiLogExecution('AUDIT', funcName,'There are no Revenue Schedules on the JE lines. Updating the processed flag  for updJEId:'+rec_id + ' Exiting Script==========================');
			return true;
		}	

		arrRevRecSchedfilters.push(new nlobjSearchFilter('internalid',null,'anyof', tempRevRec));

		nlapiLogExecution('DEBUG', funcName,'tempRevRec.length:' + tempRevRec.length + '\narrRevRecSchedfilters.length:' + arrRevRecSchedfilters.length+'arrRevRecSchedfilters:' + JSON.stringify(arrRevRecSchedfilters));
		
		var jeRevRecResults = nlapiSearchRecord('revrecschedule', SEARCH_REVREC_SOURCE, arrRevRecSchedfilters);

		var lineJEScheduleNumber = '';
		var stSourceTransaction = '';
		var stCRMId = '';
		var stRevRecScheduleSearch = '';

		var revRecSearchResult = '';

		if (!isEmpty(jeRevRecResults))
		{
			nlapiLogExecution('DEBUG', funcName, 'jeRevRecResults search result count : ' + jeRevRecResults.length);
			for(var count = 0; count < jeRevRecResults.length; count++ )
			{
				revRecSearchResult = jeRevRecResults[count];
				stRevRecScheduleSearch = revRecSearchResult.getValue('internalid');
				stSourceTransaction = revRecSearchResult.getValue('internalid','transaction');
				stCRMId = revRecSearchResult.getValue('custbody_crm_contract_id','transaction' );
				
				
				for (var j = 1; j <= jeLineCount ; j++)
				{
					lineJEScheduleNumber = recJE.getLineItemValue('line',COL_FIELD_SCHEDULE,j);
//       						nlapiLogExecution('DEBUG', funcName,' Schedule Number: ' + lineJEScheduleNumber + ' : on line :' + j);
			
					if (stRevRecScheduleSearch == lineJEScheduleNumber) 
					{
						recJE.setLineItemValue('line',COL_FIELD_SOURCE_TRANSACTION ,j, stSourceTransaction);
						recJE.setLineItemValue('line', COL_FIELD_CRM_ID,j, stCRMId);
						
						//PK Jan 7 2016 Set the custom column field Rev Rec Schedule
						
						recJE.setLineItemValue('line',COL_FIELD_REV_REC_SCHEDULE,j,lineJEScheduleNumber); 
						
						
						//nlapiLogExecution('DEBUG', funcName,'stRevRecScheduleSearchId: '+ stRevRecScheduleSearch + ' : on line : ' + j+'stSourceTransactionId: ' + stSourceTransaction + '\nstCRMId: '+ stCRMId);
					} 
				} // Inner Loop: Lines of JE
			} //Outer Loop: Rev Rec schedule from search
		} // If Search results: check for Rev Rec on one JE   

		recJE.setFieldValue('custbody_je_processed', 'T');
		var updJEId = nlapiSubmitRecord(recJE);
		//nlapiLogExecution('DEBUG', funcName, 'Successfully Updated updJEId:'+updJEId + ' Exiting Script==========================');
		nlapiLogExecution('AUDIT', funcName, 'Successfully Updated updJEId:'+updJEId + ' Exiting Script==========================');
	}catch (error) 
	{
            nlapiLogExecution('ERROR',funcName+'EXIT SCRIPT with errors | ' + error.toString(), true);
            
			if (error.getDetails != undefined) 
			{
                nlapiLogExecution('ERROR', funcName+'Process Error', 'recJE:'+recJE+':\n'+  error.getCode() + ': ' +
                error.getDetails());
            } 
			else 
			{
                nlapiLogExecution('ERROR', funcName+'Unexpected Error', 'recJE:'+recJE+':\n'+ error.toString());
            }
        } 	
	
         
}// End of function        
         
function isEmpty(stValue)
{
	if ((stValue == '') || (stValue == null) ||(stValue == undefined))
    {
        return true;
    }
    return false;
}         
         
         