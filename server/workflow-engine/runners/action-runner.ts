import { Node } from 'reactflow';
import { ExecutionContext, NodeExecutionResult, NodeRunner } from '../types';
import { sendEmail } from '../../email-service';

export class ActionRunner implements NodeRunner {
  async execute(node: Node, context: ExecutionContext): Promise<NodeExecutionResult> {
    try {

      console.log('Starting action execution for node:', node);
      const actionType = node.data?.actionType || node.data?.config?.actionType || 'generic';
      const config = node.data?.config || {};
      const integrationId = node.data?.integrationId;

      let result: any = {};

      //console.log(`Executing action: ${actionType} with config:`, config);

      switch (actionType) {
        case 'send_email':
          console.log('Preparing to send email with config', config);
          result = await this.sendEmail(config, context, integrationId);
          break;
        
        case 'Send SMS':
          result = await this.sendSMS(config, context, integrationId);
          break;
        
        case 'Create Database Record':
          result = await this.createDatabaseRecord(config, context);
          break;
        
        case 'Send Notification':
          result = await this.sendNotification(config, context);
          break;
        
        default:
          result = { message: 'Action executed', config };
      }

      return {
        success: true,
        output: result,
        shouldContinue: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        shouldContinue: false,
      };
    }
  }

  private async sendEmail(config: any, context: ExecutionContext, integrationId?: string): Promise<any> {
    const { emailTo, emailSubject, emailBody } = config;

    console.log('Sending email to:', emailTo);
    console.log('Email subject:', emailSubject);
    console.log('Email body:', emailBody);
    
    const credentials = integrationId ? context.integrationConnections.get(integrationId) : null;

    if(!await sendEmail({
      to: emailTo,
      subject: emailSubject,
      html: emailBody,
    })){
      return {
        action: 'email_failed',
        error: 'Failed to send email',
        to: this.resolveValue(emailTo, context),
      };
    }

    return {
      action: 'email_sent',
      to: this.resolveValue(emailTo, context),
      subject: this.resolveValue(emailSubject, context),
      sentAt: new Date(),
      credentialsUsed: !!credentials,
    };
  }

  private async sendSMS(config: any, context: ExecutionContext, integrationId?: string): Promise<any> {
    const { to, message } = config;
    
    const credentials = integrationId ? context.integrationConnections.get(integrationId) : null;
    
    if (!credentials || !credentials.accessToken) {
      return {
        action: 'sms_skipped',
        error: 'No Twilio credentials configured',
        to: this.resolveValue(to, context),
      };
    }
    
    return {
      action: 'sms_sent',
      to: this.resolveValue(to, context),
      message: this.resolveValue(message, context),
      sentAt: new Date(),
      credentialsUsed: !!credentials,
    };
  }

  private async createDatabaseRecord(config: any, context: ExecutionContext): Promise<any> {
    const { table, data } = config;
    
    return {
      action: 'record_created',
      table,
      recordId: crypto.randomUUID(),
      createdAt: new Date(),
    };
  }

  private async sendNotification(config: any, context: ExecutionContext): Promise<any> {
    const { title, message } = config;
    
    return {
      action: 'notification_sent',
      title: this.resolveValue(title, context),
      message: this.resolveValue(message, context),
      sentAt: new Date(),
    };
  }

  private resolveValue(value: string, context: ExecutionContext): string {
    if (!value) return '';
    
    let resolved = value;
    const variableRegex = /\{\{([^}]+)\}\}/g;
    
    resolved = resolved.replace(variableRegex, (match, varName) => {
      const trimmed = varName.trim();
      
      if (trimmed.startsWith('step.')) {
        const stepRef = trimmed.substring(5);
        const [stepId, ...path] = stepRef.split('.');
        const stepOutput = context.stepOutputs.get(stepId);
        
        if (stepOutput && path.length > 0) {
          return this.getNestedValue(stepOutput, path);
        }
        return stepOutput || match;
      }
      
      const varValue = context.variables.get(trimmed);
      return varValue !== undefined ? String(varValue) : match;
    });
    
    return resolved;
  }

  private getNestedValue(obj: any, path: string[]): any {
    return path.reduce((current, key) => current?.[key], obj);
  }
}
