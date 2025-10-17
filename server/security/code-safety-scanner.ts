export interface SafetyScanResult {
  safe: boolean;
  violations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface ViolationPattern {
  pattern: RegExp;
  message: string;
  level: 'critical' | 'high' | 'medium';
}

const CRITICAL_PATTERNS: ViolationPattern[] = [
  {
    pattern: /\beval\s*\(/gi,
    message: 'Use of eval() detected',
    level: 'critical'
  },
  {
    pattern: /new\s+Function\s*\(/gi,
    message: 'Use of new Function() detected',
    level: 'critical'
  },
  {
    pattern: /\brequire\s*\(/gi,
    message: 'Use of require() detected',
    level: 'critical'
  },
  {
    pattern: /\bimport\s*\(/gi,
    message: 'Use of dynamic import() detected',
    level: 'critical'
  },
  {
    pattern: /process\s*\.\s*exit/gi,
    message: 'Use of process.exit detected',
    level: 'critical'
  },
  {
    pattern: /process\s*\.\s*kill/gi,
    message: 'Use of process.kill detected',
    level: 'critical'
  },
  {
    pattern: /child_process/gi,
    message: 'Use of child_process module detected',
    level: 'critical'
  },
  {
    pattern: /\bexec\s*\(/gi,
    message: 'Use of exec() detected',
    level: 'critical'
  },
  {
    pattern: /\bspawn\s*\(/gi,
    message: 'Use of spawn() detected',
    level: 'critical'
  },
  {
    pattern: /\bfs\s*\.\s*(readFile|writeFile|readFileSync|writeFileSync|unlink|unlinkSync|rmdir|rmdirSync|mkdir|mkdirSync|readdir|readdirSync|stat|statSync|createReadStream|createWriteStream|access|accessSync|appendFile|appendFileSync|chmod|chmodSync|chown|chownSync|copyFile|copyFileSync|rename|renameSync)/gi,
    message: 'Use of fs module file operations detected',
    level: 'critical'
  },
  {
    pattern: /\b__dirname\b/gi,
    message: 'Use of __dirname detected',
    level: 'critical'
  },
  {
    pattern: /\b__filename\b/gi,
    message: 'Use of __filename detected',
    level: 'critical'
  },
  {
    pattern: /\bglobal\s*\./gi,
    message: 'Use of global object manipulation detected',
    level: 'critical'
  },
  {
    pattern: /\bglobalThis\s*\./gi,
    message: 'Use of globalThis object manipulation detected',
    level: 'critical'
  }
];

const HIGH_RISK_PATTERNS: ViolationPattern[] = [
  {
    pattern: /\bfetch\s*\(/gi,
    message: 'Use of fetch() for network calls detected',
    level: 'high'
  },
  {
    pattern: /\blocalStorage\s*\./gi,
    message: 'Use of localStorage detected',
    level: 'high'
  },
  {
    pattern: /\bsessionStorage\s*\./gi,
    message: 'Use of sessionStorage detected',
    level: 'high'
  },
  {
    pattern: /\bindexedDB\s*\./gi,
    message: 'Use of indexedDB detected',
    level: 'high'
  },
  {
    pattern: /document\s*\.\s*cookie/gi,
    message: 'Use of document.cookie detected',
    level: 'high'
  },
  {
    pattern: /(\(.*[+*]{2,}.*\)|\[[^\]]*[+*]{2,}[^\]]*\]|\{[^}]*[+*]{2,}[^}]*\})/g,
    message: 'Potential catastrophic backtracking regex pattern detected',
    level: 'high'
  }
];

const MEDIUM_RISK_PATTERNS: ViolationPattern[] = [
  {
    pattern: /\bconsole\s*\.\s*(log|debug|info|warn|error|trace|dir|table)/gi,
    message: 'Use of console methods detected (potential data exposure)',
    level: 'medium'
  },
  {
    pattern: /window\s*\.\s*open\s*\(/gi,
    message: 'Use of window.open() detected',
    level: 'medium'
  },
  {
    pattern: /window\s*\.\s*location\s*=/gi,
    message: 'Use of window.location assignment detected',
    level: 'medium'
  },
  {
    pattern: /location\s*\.\s*href\s*=/gi,
    message: 'Use of location.href assignment detected',
    level: 'medium'
  },
  {
    pattern: /\bfor\s*\([^)]*\)\s*\{[\s\S]{500,}\}/g,
    message: 'Potentially excessive loop detected (DOS risk)',
    level: 'medium'
  },
  {
    pattern: /\bwhile\s*\([^)]*\)\s*\{[\s\S]{500,}\}/g,
    message: 'Potentially excessive while loop detected (DOS risk)',
    level: 'medium'
  }
];

const OBFUSCATION_PATTERNS: ViolationPattern[] = [
  {
    pattern: /\\x[0-9a-f]{2}/gi,
    message: 'Hex encoding detected (potential obfuscation)',
    level: 'high'
  },
  {
    pattern: /\\u[0-9a-f]{4}/gi,
    message: 'Unicode encoding detected (potential obfuscation)',
    level: 'high'
  },
  {
    pattern: /\bString\s*\.\s*fromCharCode/gi,
    message: 'String.fromCharCode detected (potential obfuscation)',
    level: 'high'
  },
  {
    pattern: /\batob\s*\(/gi,
    message: 'Base64 decoding (atob) detected (potential obfuscation)',
    level: 'high'
  },
  {
    pattern: /(["'`].*eval.*["'`])/gi,
    message: 'eval within string detected (obfuscated execution)',
    level: 'critical'
  }
];

function detectViolations(
  code: string,
  patterns: ViolationPattern[]
): Array<{ violation: string; line: number }> {
  const violations: Array<{ violation: string; line: number }> = [];
  const lines = code.split('\n');

  for (const pattern of patterns) {
    // Reset lastIndex before each pattern scan to prevent regex state leakage
    pattern.pattern.lastIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Reset lastIndex before each line test to ensure proper matching
      pattern.pattern.lastIndex = 0;
      
      if (pattern.pattern.test(line)) {
        violations.push({
          violation: `${pattern.message} (line ${i + 1})`,
          line: i + 1
        });
      }
    }
  }

  return violations;
}

function determineRiskLevel(
  criticalCount: number,
  highCount: number,
  mediumCount: number
): 'low' | 'medium' | 'high' | 'critical' {
  if (criticalCount > 0) {
    return 'critical';
  }
  if (highCount >= 3) {
    return 'critical';
  }
  if (highCount > 0) {
    return 'high';
  }
  if (mediumCount >= 5) {
    return 'high';
  }
  if (mediumCount > 0) {
    return 'medium';
  }
  return 'low';
}

export function scanCodeForSafety(code: string): SafetyScanResult {
  const allViolations: string[] = [];

  const criticalViolations = detectViolations(code, CRITICAL_PATTERNS);
  const highRiskViolations = detectViolations(code, HIGH_RISK_PATTERNS);
  const mediumRiskViolations = detectViolations(code, MEDIUM_RISK_PATTERNS);
  const obfuscationViolations = detectViolations(code, OBFUSCATION_PATTERNS);

  criticalViolations.forEach(v => allViolations.push(`[CRITICAL] ${v.violation}`));
  highRiskViolations.forEach(v => allViolations.push(`[HIGH] ${v.violation}`));
  obfuscationViolations.forEach(v => {
    const level = OBFUSCATION_PATTERNS.find(p => p.message === v.violation.split(' (line')[0])?.level || 'high';
    allViolations.push(`[${level.toUpperCase()}] ${v.violation}`);
  });
  mediumRiskViolations.forEach(v => allViolations.push(`[MEDIUM] ${v.violation}`));

  const criticalCount = criticalViolations.length + obfuscationViolations.filter(v => 
    OBFUSCATION_PATTERNS.find(p => v.violation.includes(p.message))?.level === 'critical'
  ).length;
  
  const highCount = highRiskViolations.length + obfuscationViolations.filter(v => 
    OBFUSCATION_PATTERNS.find(p => v.violation.includes(p.message))?.level === 'high'
  ).length;
  
  const mediumCount = mediumRiskViolations.length;

  const riskLevel = determineRiskLevel(criticalCount, highCount, mediumCount);
  const safe = riskLevel === 'low' || riskLevel === 'medium';

  return {
    safe,
    violations: allViolations,
    riskLevel
  };
}
