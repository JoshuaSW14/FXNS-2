// Using Node.js built-in fetch (Node 18+)

// QA Testing Agent for fxns.ca Tool Builder Workflow
// Tests: Create → Edit → Update → Run functionality

class ToolBuilderQA {
  private baseUrl: string;
  private testResults: any[] = [];
  private cookies: string = '';

  constructor(baseUrl = `${process.env.FRONTEND_URL || 'https://localhost:5000'}`) {
    this.baseUrl = baseUrl;
  }

  // Helper method to make API requests
  private async makeRequest(method: string, endpoint: string, data?: any) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const options: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': this.cookies
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    // Update cookies if provided
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      this.cookies = setCookie.split(';')[0];
    }

    const responseText = await response.text();
    
    return {
      ok: response.ok,
      status: response.status,
      data: responseText ? JSON.parse(responseText) : null,
      headers: response.headers
    };
  }

  // Log test results
  private logResult(testName: string, success: boolean, details: any = {}) {
    const result = {
      test: testName,
      success,
      timestamp: new Date().toISOString(),
      details
    };
    
    this.testResults.push(result);
    
    console.log(`\n${success ? '✅' : '❌'} ${testName}`);
    if (!success || details.error) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  // Test 1: Create a new calculator tool
  async testCreateCalculatorTool() {
    try {
      console.log('\n🧪 Testing: Create Calculator Tool');
      
      // Step 1: Create a new draft
      const draftResponse = await this.makeRequest('POST', '/api/tool-builder/drafts', {
        name: 'QA Test Calculator',
        category: 'calculator',
        description: 'Test calculator that doubles a number'
      });

      if (!draftResponse.ok) {
        this.logResult('Create Draft', false, { error: draftResponse.data });
        return null;
      }

      const draftId = draftResponse.data.data.id;
      
      // Step 2: Update draft with input configuration
      const updateResponse = await this.makeRequest('PUT', `/api/tool-builder/drafts/${draftId}`, {
        name: 'QA Test Calculator',
        description: 'Test calculator that doubles a number',
        category: 'calculator',
        status: 'draft',
        inputConfig: [{
          id: 'number',
          type: 'number',
          label: 'Number to Double',
          required: true,
          placeholder: 'Enter a number'
        }],
        logicConfig: [{
          id: 'calculation-step',
          type: 'calculation',
          name: 'Double the Number',
          config: {
            calculation: {
              formula: 'number * 2',
              variables: [{
                name: 'number',
                fieldId: 'number'
              }]
            }
          }
        }],
        outputConfig: {
          type: 'single_value',
          format: 'number',
          config: {
            sourceStepId: 'calculation-step'
          }
        }
      });

      if (!updateResponse.ok) {
        this.logResult('Update Draft Configuration', false, { error: updateResponse.data });
        return null;
      }

      // Step 3: Test the draft
      const testResponse = await this.makeRequest('POST', `/api/tool-builder/drafts/${draftId}/test`, {
        number: 5
      });

      if (!testResponse.ok) {
        this.logResult('Test Draft', false, { error: testResponse.data });
        return null;
      }

      const testResult = testResponse.data;
      const expectedResult = 10; // 5 * 2
      
      if (testResult.outputs && testResult.outputs.result === expectedResult) {
        this.logResult('Test Draft Execution', true, { input: 5, output: testResult.outputs.result });
      } else {
        this.logResult('Test Draft Execution', false, { 
          expected: expectedResult, 
          actual: testResult.outputs,
          fullResponse: testResult
        });
      }

      // Step 4: Publish the draft
      const publishResponse = await this.makeRequest('POST', `/api/tool-builder/drafts/${draftId}/publish`);

      if (!publishResponse.ok) {
        this.logResult('Publish Tool', false, { error: publishResponse.data });
        return null;
      }

      const publishedToolId = publishResponse.data.data.toolId;
      this.logResult('Create Calculator Tool - Complete', true, { 
        draftId, 
        publishedToolId,
        testPassed: testResult.outputs?.result === expectedResult
      });

      return publishedToolId;

    } catch (error) {
      this.logResult('Create Calculator Tool', false, { error: error.message });
      return null;
    }
  }

  // Test 2: Edit existing tool
  async testEditTool(toolId: string) {
    try {
      console.log('\n🔧 Testing: Edit Tool Functionality');

      // Step 1: Try to load existing draft
      const existingDraftResponse = await this.makeRequest('GET', `/api/tool-builder/drafts/${toolId}`);
      
      let draftId: string;
      
      if (existingDraftResponse.status === 404) {
        // Step 2: Convert published tool to draft
        const convertResponse = await this.makeRequest('POST', `/api/tool-builder/drafts/from-published/${toolId}`);
        
        if (!convertResponse.ok) {
          this.logResult('Convert Tool to Draft', false, { error: convertResponse.data });
          return null;
        }
        
        draftId = convertResponse.data.data.id;
        this.logResult('Convert Published Tool to Draft', true, { draftId });
      } else if (existingDraftResponse.ok) {
        draftId = existingDraftResponse.data.data.id;
        this.logResult('Load Existing Draft', true, { draftId });
      } else {
        this.logResult('Load/Convert Draft', false, { error: existingDraftResponse.data });
        return null;
      }

      // Step 3: Load the draft to verify form population
      const draftResponse = await this.makeRequest('GET', `/api/tool-builder/drafts/${draftId}`);
      
      if (!draftResponse.ok) {
        this.logResult('Load Draft for Editing', false, { error: draftResponse.data });
        return null;
      }

      const draft = draftResponse.data.data;
      
      // Verify form population
      const hasInputConfig = draft.inputConfig && draft.inputConfig.length > 0;
      const hasLogicConfig = draft.logicConfig && draft.logicConfig.length > 0;
      const hasOutputConfig = draft.outputConfig && Object.keys(draft.outputConfig).length > 0;

      this.logResult('Edit Form Population', hasInputConfig && hasLogicConfig && hasOutputConfig, {
        inputFields: draft.inputConfig?.length || 0,
        logicSteps: draft.logicConfig?.length || 0,
        hasOutputConfig,
        inputConfig: draft.inputConfig,
        logicConfig: draft.logicConfig
      });

      // Step 4: Make a modification (change multiplier from 2 to 3)
      const modifiedLogicConfig = [...draft.logicConfig];
      if (modifiedLogicConfig[0]?.type === 'calculation') {
        modifiedLogicConfig[0].config.calculation.formula = 'number * 3';
      }

      const modifyResponse = await this.makeRequest('PUT', `/api/tool-builder/drafts/${draftId}`, {
        name: draft.name + ' (Modified)',
        description: draft.description,
        category: draft.category,
        status: 'draft',
        inputConfig: draft.inputConfig,
        logicConfig: modifiedLogicConfig,
        outputConfig: draft.outputConfig
      });

      if (!modifyResponse.ok) {
        this.logResult('Modify Draft', false, { error: modifyResponse.data });
        return null;
      }

      // Step 5: Test modified draft
      const modifiedTestResponse = await this.makeRequest('POST', `/api/tool-builder/drafts/${draftId}/test`, {
        number: 4
      });

      if (!modifiedTestResponse.ok) {
        this.logResult('Test Modified Draft', false, { error: modifiedTestResponse.data });
        return null;
      }

      const modifiedResult = modifiedTestResponse.data;
      const expectedModifiedResult = 12; // 4 * 3
      
      const modificationWorked = modifiedResult.outputs?.result === expectedModifiedResult;
      this.logResult('Test Modified Logic', modificationWorked, {
        input: 4,
        expected: expectedModifiedResult,
        actual: modifiedResult.outputs?.result
      });

      this.logResult('Edit Tool Functionality - Complete', true, { draftId, modificationWorked });
      
      return draftId;

    } catch (error) {
      this.logResult('Edit Tool Functionality', false, { error: error.message });
      return null;
    }
  }

  // Test 3: Run published tool
  async testRunTool(toolId: string) {
    try {
      console.log('\n🏃 Testing: Run Published Tool');

      // Step 1: Get tool info
      const toolResponse = await this.makeRequest('GET', `/api/tools/${toolId}`);
      
      if (!toolResponse.ok) {
        this.logResult('Get Tool Info', false, { error: toolResponse.data });
        return false;
      }

      const tool = toolResponse.data.fxn;
      this.logResult('Get Tool Info', true, { 
        title: tool.title,
        hasInputSchema: Object.keys(tool.inputSchema).length > 0
      });

      // Step 2: Run the tool with test data
      const runResponse = await this.makeRequest('POST', `/api/tools/${toolId}/run`, {
        number: 6
      });

      if (!runResponse.ok) {
        this.logResult('Run Tool', false, { 
          error: runResponse.data,
          status: runResponse.status 
        });
        return false;
      }

      const result = runResponse.data;
      
      // Check if result is meaningful (not empty)
      const hasResult = result.outputs && Object.keys(result.outputs).length > 0;
      const resultValue = result.outputs?.result;
      
      this.logResult('Run Tool Execution', hasResult && resultValue !== undefined, {
        input: 6,
        output: resultValue,
        fullResult: result.outputs,
        success: result.success
      });

      return hasResult && resultValue !== undefined;

    } catch (error) {
      this.logResult('Run Published Tool', false, { error: error.message });
      return false;
    }
  }

  // Test 4: End-to-end workflow test
  async testEndToEndWorkflow() {
    console.log('\n🚀 Starting End-to-End Tool Builder QA Tests');
    console.log('='.repeat(50));

    const startTime = Date.now();

    // Test 1: Create calculator tool
    const toolId = await this.testCreateCalculatorTool();
    if (!toolId) {
      console.log('\n❌ End-to-end test failed at creation step');
      return false;
    }

    // Small delay to ensure tool is fully created
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Edit the tool
    const editSuccess = await this.testEditTool(toolId);
    if (!editSuccess) {
      console.log('\n❌ End-to-end test failed at edit step');
      return false;
    }

    // Small delay to ensure changes are processed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 3: Run the original published tool
    const runSuccess = await this.testRunTool(toolId);
    if (!runSuccess) {
      console.log('\n❌ End-to-end test failed at run step');
      return false;
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Generate summary
    this.generateSummary(duration);

    return true;
  }

  // Generate test summary
  private generateSummary(duration: number) {
    console.log('\n' + '='.repeat(50));
    console.log('📊 QA Test Summary');
    console.log('='.repeat(50));

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📊 Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   - ${r.test}: ${r.details?.error || 'Unknown error'}`);
        });
    }

    console.log('\n📋 Detailed Results:');
    this.testResults.forEach(r => {
      console.log(`   ${r.success ? '✅' : '❌'} ${r.test}`);
    });

    console.log('\n' + '='.repeat(50));
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! The tool builder workflow is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Check the details above for issues to fix.');
    }
  }
}

// Export for use in testing
export default ToolBuilderQA;

// Run tests if executed directly  
const qa = new ToolBuilderQA();
qa.testEndToEndWorkflow().then((success) => {
  process.exit(success ? 0 : 1);
}).catch((error) => {
  console.error('QA test failed with error:', error);
  process.exit(1);
});