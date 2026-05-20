import * as vscode from "vscode"
import { lineColFromIndex } from "../lexer/lineColFromIndex"

export interface LintRule {
    id: string
    name: string
    description: string
    defaultSeverity: vscode.DiagnosticSeverity
    defaultEnabled: boolean
    category: string
}

export interface LintRuleConfig {
    enabled: boolean
    severity: vscode.DiagnosticSeverity
}

export class SqlLinter {
    private rules = new Map<string, LintRule>()
    private config = new Map<string, LintRuleConfig>()

    constructor() {
        this.registerBuiltInRules()
        this.loadConfig()
    }

    private registerBuiltInRules(): void {
        const builtInRules: LintRule[] = [
            { id: "avoid_select_star", name: "避免 SELECT *", description: "建议明确指定列名而不是使用 SELECT *", defaultSeverity: vscode.DiagnosticSeverity.Warning, defaultEnabled: true, category: "code-style" },
            { id: "explicit_join_type", name: "显式 JOIN 类型", description: "建议显式指定 JOIN 类型（INNER/LEFT/RIGHT）", defaultSeverity: vscode.DiagnosticSeverity.Information, defaultEnabled: true, category: "code-style" },
            { id: "uppercase_keywords", name: "关键字大写", description: "建议 SQL 关键字使用大写", defaultSeverity: vscode.DiagnosticSeverity.Information, defaultEnabled: false, category: "code-style" },
            { id: "consistent_aliasing", name: "一致的别名", description: "建议使用有意义的表别名", defaultSeverity: vscode.DiagnosticSeverity.Information, defaultEnabled: false, category: "code-style" },
            { id: "limit_with_order_by", name: "LIMIT 需要 ORDER BY", description: "使用 LIMIT 时建议同时使用 ORDER BY 以确保结果稳定", defaultSeverity: vscode.DiagnosticSeverity.Warning, defaultEnabled: true, category: "best-practices" },
            { id: "avoid_column_count_mismatch", name: "列数匹配检查", description: "INSERT 语句的列数和 VALUES 的数量应该匹配", defaultSeverity: vscode.DiagnosticSeverity.Error, defaultEnabled: true, category: "error-check" },
            { id: "use_coalesce_over_isnull", name: "使用 COALESCE", description: "建议使用更通用的 COALESCE 而不是 ISNULL/IFNULL", defaultSeverity: vscode.DiagnosticSeverity.Information, defaultEnabled: false, category: "best-practices" },
            { id: "explicit_column_aliasing", name: "显式列别名", description: "建议使用 AS 关键字明确指定列别名", defaultSeverity: vscode.DiagnosticSeverity.Information, defaultEnabled: false, category: "code-style" },
            { id: "avoid_correlated_subqueries", name: "避免相关子查询", description: "相关子查询可能影响性能，考虑使用 JOIN 代替", defaultSeverity: vscode.DiagnosticSeverity.Warning, defaultEnabled: false, category: "performance" },
            { id: "missing_primary_key", name: "缺失主键", description: "CREATE TABLE 语句建议定义主键", defaultSeverity: vscode.DiagnosticSeverity.Warning, defaultEnabled: true, category: "best-practices" },
            { id: "use_current_timestamp", name: "使用 CURRENT_TIMESTAMP", description: "建议使用 CURRENT_TIMESTAMP 而不是特定方言的函数", defaultSeverity: vscode.DiagnosticSeverity.Information, defaultEnabled: true, category: "best-practices" },
            { id: "avoid_select_in_insert", name: "避免 INSERT SELECT *", description: "INSERT 语句中建议明确指定列名", defaultSeverity: vscode.DiagnosticSeverity.Warning, defaultEnabled: true, category: "best-practices" },
            { id: "long_query_line", name: "过长的查询行", description: "建议将长查询多行格式化", defaultSeverity: vscode.DiagnosticSeverity.Information, defaultEnabled: false, category: "code-style" },
            { id: "duplicate_column_aliases", name: "重复的列别名", description: "查询结果中有重复的列别名", defaultSeverity: vscode.DiagnosticSeverity.Warning, defaultEnabled: true, category: "code-style" },
            { id: "missing_query_comment", name: "复杂查询缺少说明注释", description: "复杂查询（多行/多JOIN/多子查询）建议添加说明注释", defaultSeverity: vscode.DiagnosticSeverity.Warning, defaultEnabled: true, category: "best-practices" },
            { id: "missing_column_comment", name: "DDL 列缺少 COMMENT", description: "CREATE TABLE 中的列定义建议添加 COMMENT 注释", defaultSeverity: vscode.DiagnosticSeverity.Warning, defaultEnabled: true, category: "best-practices" },
            { id: "commented_out_code", name: "注释掉的代码", description: "发现疑似注释掉的大段代码，建议确认后删除或取消注释", defaultSeverity: vscode.DiagnosticSeverity.Information, defaultEnabled: true, category: "code-style" },
            { id: "expired_todo", name: "过期的 TODO/FIXME", description: "TODO/FIXME 标记已过期，请确认是否仍需处理", defaultSeverity: vscode.DiagnosticSeverity.Information, defaultEnabled: true, category: "best-practices" },
        ]

        builtInRules.forEach(rule => {
            this.rules.set(rule.id, rule)
        })
    }

    private loadConfig(): void {
        const config = vscode.workspace.getConfiguration('Hive-Formatter')
        
        this.rules.forEach((rule, id) => {
            const ruleConfig = config.get<{ enabled?: boolean, severity?: string }>(`lint.${id}`)
            const enabled = ruleConfig?.enabled ?? rule.defaultEnabled
            const severityStr = ruleConfig?.severity
            let severity: vscode.DiagnosticSeverity = rule.defaultSeverity
            
            if (severityStr) {
                switch (severityStr.toLowerCase()) {
                    case 'error': severity = vscode.DiagnosticSeverity.Error; break
                    case 'warning': severity = vscode.DiagnosticSeverity.Warning; break
                    case 'information': severity = vscode.DiagnosticSeverity.Information; break
                    case 'hint': severity = vscode.DiagnosticSeverity.Hint; break
                }
            }

            this.config.set(id, { enabled, severity })
        })
    }

    public getRules(): LintRule[] {
        return Array.from(this.rules.values())
    }

    public isRuleEnabled(ruleId: string): boolean {
        return this.config.get(ruleId)?.enabled ?? false
    }

    public getRuleSeverity(ruleId: string): vscode.DiagnosticSeverity {
        return this.config.get(ruleId)?.severity ?? this.rules.get(ruleId)?.defaultSeverity ?? vscode.DiagnosticSeverity.Warning
    }

    public lint(text: string, document: vscode.TextDocument): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = []
        
        if (this.isRuleEnabled('avoid_select_star')) {
            this.checkSelectStar(text, document, diagnostics)
        }
        if (this.isRuleEnabled('explicit_join_type')) {
            this.checkExplicitJoinType(text, document, diagnostics)
        }
        if (this.isRuleEnabled('limit_with_order_by')) {
            this.checkLimitWithOrderBy(text, document, diagnostics)
        }
        if (this.isRuleEnabled('avoid_column_count_mismatch')) {
            this.checkColumnCountMismatch(text, document, diagnostics)
        }
        if (this.isRuleEnabled('missing_primary_key')) {
            this.checkMissingPrimaryKey(text, document, diagnostics)
        }
        if (this.isRuleEnabled('avoid_select_in_insert')) {
            this.checkSelectInInsert(text, document, diagnostics)
        }
        if (this.isRuleEnabled('duplicate_column_aliases')) {
            this.checkDuplicateColumnAliases(text, document, diagnostics)
        }
        if (this.isRuleEnabled('use_coalesce_over_isnull')) {
            this.checkUseCoalesce(text, document, diagnostics)
        }
        if (this.isRuleEnabled('use_current_timestamp')) {
            this.checkUseCurrentTimestamp(text, document, diagnostics)
        }
        if (this.isRuleEnabled('avoid_correlated_subqueries')) {
            this.checkCorrelatedSubqueries(text, document, diagnostics)
        }
        if (this.isRuleEnabled('long_query_line')) {
            this.checkLongQueryLine(text, document, diagnostics)
        }
        if (this.isRuleEnabled('explicit_column_aliasing')) {
            this.checkExplicitColumnAliasing(text, document, diagnostics)
        }
        if (this.isRuleEnabled('missing_query_comment')) {
            this.checkMissingQueryComment(text, document, diagnostics)
        }
        if (this.isRuleEnabled('missing_column_comment')) {
            this.checkMissingColumnComment(text, document, diagnostics)
        }
        if (this.isRuleEnabled('commented_out_code')) {
            this.checkCommentedOutCode(text, document, diagnostics)
        }
        if (this.isRuleEnabled('expired_todo')) {
            this.checkExpiredTodo(text, document, diagnostics)
        }

        return diagnostics
    }

    private addDiagnostic(text: string, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[], matchIndex: number, length: number, message: string, ruleId: string): void {
        const severity = this.getRuleSeverity(ruleId)
        const lineCol = lineColFromIndex(text, matchIndex)
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(lineCol.line - 1, lineCol.col, lineCol.line - 1, lineCol.col + length),
            `【第 ${lineCol.line} 行】${message}`,
            severity
        )
        diagnostic.source = "Hive Formatter Linter"
        diagnostic.code = ruleId
        diagnostics.push(diagnostic)
    }

    private checkSelectStar(text: string, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const pattern = /\bselect\b\s*\*\s*(?:\bfrom\b|;|$)/gi
        let match
        while ((match = pattern.exec(text)) !== null) {
            const starIndex = match.index + match[0].indexOf('*')
            this.addDiagnostic(text, document, diagnostics, starIndex, 1, "建议明确指定列名而不是使用 SELECT *", "avoid_select_star")
        }
    }

    private checkExplicitJoinType(text: string, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const pattern = /\bfrom\b[^;]*?\bjoin\b(?!\s*(?:inner|left|right|full|outer|cross))/gi
        let match
        while ((match = pattern.exec(text)) !== null) {
            const joinIndex = match[0].toLowerCase().lastIndexOf('join')
            if (joinIndex !== -1) {
                this.addDiagnostic(text, document, diagnostics, match.index + (match[0].length - 4), 4, "建议显式指定 JOIN 类型（INNER/LEFT/RIGHT）", "explicit_join_type")
            }
        }
    }

    private checkLimitWithOrderBy(text: string, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const selectPattern = /\bselect\b[^;]*?\blimit\b(?!.*\border\s+by\b)/gi
        let match
        while ((match = selectPattern.exec(text)) !== null) {
            const limitIndex = match[0].toLowerCase().lastIndexOf('limit')
            if (limitIndex !== -1) {
                this.addDiagnostic(text, document, diagnostics, match.index + limitIndex, 5, "使用 LIMIT 时建议同时使用 ORDER BY 以确保结果稳定", "limit_with_order_by")
            }
        }
    }

    private checkColumnCountMismatch(text: string, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const pattern = /\binsert\s+into\s+(\w+)\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)/gi
        let match
        while ((match = pattern.exec(text)) !== null) {
            const columnsText = match[2]
            const valuesText = match[3]
            
            const columnCount = this.countCommaSeparated(columnsText)
            const valueCount = this.countCommaSeparated(valuesText)
            
            if (columnCount !== valueCount) {
                this.addDiagnostic(text, document, diagnostics, match.index, match[0].length, `列数不匹配：${columnCount} 列，但 ${valueCount} 个值`, "avoid_column_count_mismatch")
            }
        }
    }

    private countCommaSeparated(text: string): number {
        let count = 0
        let inString = false
        let stringChar = ''
        let inParen = 0
        
        for (const char of text) {
            if (char === '"' || char === "'") {
                if (!inString) {
                    inString = true
                    stringChar = char
                } else if (char === stringChar) {
                    inString = false
                }
            } else if (!inString) {
                if (char === '(') inParen++
                else if (char === ')') inParen--
                else if (char === ',' && inParen === 0) count++
            }
        }
        return count + 1
    }

    private checkMissingPrimaryKey(text: string, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const pattern = /\bcreate\s+table\b(?!.*\bprimary\s+key\b)/gi
        let match
        while ((match = pattern.exec(text)) !== null) {
            // 检查是否有常见的主键字段名，如果有就不警告
            const hasCommonIdFields = /\b(id|uuid|guid|_id|Id|ID|UUID|GUID)\b/i.test(match.input.slice(match.index))
            if (!hasCommonIdFields) {
                this.addDiagnostic(text, document, diagnostics, match.index, 12, "CREATE TABLE 语句建议定义主键", "missing_primary_key")
            }
        }
    }

    private checkSelectInInsert(text: string, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const pattern = /\binsert\s+into\s+\w+\s*\bselect\s+\*\b/gi
        let match
        while ((match = pattern.exec(text)) !== null) {
            const starIndex = match[0].indexOf('*')
            this.addDiagnostic(text, document, diagnostics, match.index + starIndex, 1, "INSERT 语句中建议明确指定列名", "avoid_select_in_insert")
        }
    }

    private checkDuplicateColumnAliases(text: string, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const selectPattern = /\bselect\b(.*?)\bfrom\b/gi
        let selectMatch
        
        while ((selectMatch = selectPattern.exec(text)) !== null) {
            const columnsPart = selectMatch[1]
            const aliases = new Map<string, number[]>()
            
            const aliasPattern = /\b(\w+)\b(?:\s+as\s+)?(\w+)?/gi
            let aliasMatch
            
            while ((aliasMatch = aliasPattern.exec(columnsPart)) !== null) {
                const alias = (aliasMatch[2] || aliasMatch[1]).toLowerCase()
                if (!aliases.has(alias)) {
                    aliases.set(alias, [])
                }
                const aliasPositions = aliases.get(alias)
                if (aliasPositions) {
                    aliasPositions.push(selectMatch.index + aliasMatch.index)
                }
            }
            
            for (const [alias, positions] of aliases) {
                if (positions.length > 1) {
                    for (let i = 1; i < positions.length; i++) {
                        this.addDiagnostic(text, document, diagnostics, positions[i], alias.length, `列别名 "${alias}" 重复`, "duplicate_column_aliases")
                    }
                }
            }
        }
    }

    private checkUseCoalesce(text: string, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const pattern = /\b(ifnull|isnull)\s*\(/gi
        let match
        while ((match = pattern.exec(text)) !== null) {
            this.addDiagnostic(text, document, diagnostics, match.index, match[1].length, "建议使用更通用的 COALESCE 函数", "use_coalesce_over_isnull")
        }
    }

    private checkUseCurrentTimestamp(text: string, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const pattern = /\b(now|sysdate|getdate|current_date)\s*\(/gi
        let match
        while ((match = pattern.exec(text)) !== null) {
            this.addDiagnostic(text, document, diagnostics, match.index, match[1].length, "建议使用 CURRENT_TIMESTAMP 获得更好的兼容性", "use_current_timestamp")
        }
    }

    private checkCorrelatedSubqueries(text: string, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        // 暂时禁用此规则的检查，简化实现
        const pattern = /\bwhere\s+\w+\s*=\s*\(\s*select/gi
        let match
        while ((match = pattern.exec(text)) !== null) {
            this.addDiagnostic(text, document, diagnostics, match.index, match[0].length, "子查询可能影响性能，考虑使用 JOIN 代替", "avoid_correlated_subqueries")
        }
    }

    private checkLongQueryLine(text: string, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const lines = text.split('\n')
        lines.forEach((line, index) => {
            if (line.length > 120 && (line.toLowerCase().includes('select') || line.toLowerCase().includes('join') || line.toLowerCase().includes('where'))) {
                this.addDiagnostic(text, document, diagnostics, text.indexOf(line), Math.min(line.length, 120), "建议将长查询多行格式化", "long_query_line")
            }
        })
    }

    private checkExplicitColumnAliasing(text: string, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const selectPattern = /\bselect\b(.*?)\bfrom\b/gi
        let selectMatch

        while ((selectMatch = selectPattern.exec(text)) !== null) {
            const columnsPart = selectMatch[1]
            const aliasWithoutAs = /\b(\w+)\s+(\w+)\s*(?:,|$)/gi
            let match

            while ((match = aliasWithoutAs.exec(columnsPart)) !== null) {
                if (!match[0].toLowerCase().includes('as')) {
                    this.addDiagnostic(text, document, diagnostics, selectMatch.index + match.index, match[0].length, "建议使用 AS 关键字明确指定列别名", "explicit_column_aliasing")
                }
            }
        }
    }

    private checkMissingQueryComment(text: string, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const config = vscode.workspace.getConfiguration('Hive-Formatter')
        const thresholdLines = config.get<number>('lint.missing_query_comment_threshold_line_count', 20)
        const thresholdJoins = config.get<number>('lint.missing_query_comment_threshold_join_count', 3)
        const thresholdSubqueries = config.get<number>('lint.missing_query_comment_threshold_subquery_count', 2)

        if (document.lineCount < 20) return

        const selectPattern = /\bSELECT\b/gi
        let match
        while ((match = selectPattern.exec(text)) !== null) {
            const selectStartLine = document.positionAt(match.index).line
            const statementEnd = this.findStatementEnd(text, match.index)
            const statementEndLine = document.positionAt(statementEnd).line
            const lineCount = statementEndLine - selectStartLine + 1

            const statementText = text.substring(match.index, statementEnd)
            const joinCount = (statementText.match(/\bJOIN\b/gi) || []).length
            const subqueryCount = (statementText.match(/\(\s*SELECT\b/gi) || []).length

            const isComplex = lineCount >= thresholdLines || joinCount >= thresholdJoins || subqueryCount >= thresholdSubqueries
            if (!isComplex) continue

            const hasCommentAbove = this.hasCommentAboveLine(text, document, selectStartLine)
            if (hasCommentAbove) continue

            const details: string[] = []
            if (lineCount >= thresholdLines) details.push(`${lineCount}行`)
            if (joinCount >= thresholdJoins) details.push(`${joinCount}个JOIN`)
            if (subqueryCount >= thresholdSubqueries) details.push(`${subqueryCount}个子查询`)

            this.addDiagnostic(
                text, document, diagnostics,
                match.index, 6,
                `复杂查询（${details.join('/')}）缺少说明注释，建议添加查询功能描述`,
                "missing_query_comment"
            )
        }
    }

    private findStatementEnd(text: string, startIndex: number): number {
        let depth = 0
        let i = startIndex
        while (i < text.length) {
            if (text[i] === '(') depth++
            else if (text[i] === ')') depth--
            else if (text[i] === ';' && depth === 0) return i + 1
            i++
        }
        return text.length
    }

    private hasCommentAboveLine(text: string, document: vscode.TextDocument, line: number): boolean {
        for (let i = Math.max(0, line - 3); i < line; i++) {
            const lineText = document.lineAt(i).text.trim()
            if (lineText.startsWith('--') || lineText.startsWith('/*')) return true
        }
        return false
    }

    private checkMissingColumnComment(text: string, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const config = vscode.workspace.getConfiguration('Hive-Formatter')
        const aggregate = config.get<boolean>('lint.missing_column_comment_aggregate', true)
        const externalExempt = config.get<boolean>('lint.missing_column_comment_external_table_exempt', false)

        const createTablePattern = /\bCREATE\s+(?:EXTERNAL\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[\w.]+\s*\(/gi
        let ctMatch
        while ((ctMatch = createTablePattern.exec(text)) !== null) {
            const isExternal = /\bEXTERNAL\b/i.test(ctMatch[0])
            if (externalExempt && isExternal) continue

            const openParenIndex = ctMatch.index + ctMatch[0].length - 1
            const closeParenIndex = this.findMatchingParen(text, openParenIndex)
            if (closeParenIndex === -1) continue

            const columnsText = text.substring(openParenIndex + 1, closeParenIndex)
            const missingColumns: { name: string; index: number }[] = []

            const lines = columnsText.split('\n')
            let globalOffset = openParenIndex + 1
            for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed) { globalOffset += line.length + 1; continue }
                if (/^\s*(PRIMARY\s+KEY|CONSTRAINT|INDEX|KEY|UNIQUE|FOREIGN)/i.test(trimmed)) {
                    globalOffset += line.length + 1
                    continue
                }
                const colMatch = trimmed.match(/^(\w+)\s+\w+/)
                if (colMatch && !/COMMENT\s+'/.test(trimmed)) {
                    const colName = colMatch[1]
                    const colStartInLine = line.indexOf(colName)
                    missingColumns.push({
                        name: colName,
                        index: globalOffset + colStartInLine
                    })
                }
                globalOffset += line.length + 1
            }

            if (missingColumns.length === 0) continue

            if (aggregate && missingColumns.length > 1) {
                this.addDiagnostic(
                    text, document, diagnostics,
                    ctMatch.index, ctMatch[0].indexOf('('),
                    `CREATE TABLE 中有 ${missingColumns.length} 个列缺少 COMMENT 注释`,
                    "missing_column_comment"
                )
            } else {
                for (const col of missingColumns) {
                    this.addDiagnostic(
                        text, document, diagnostics,
                        col.index, col.name.length,
                        `列 '${col.name}' 缺少 COMMENT 注释`,
                        "missing_column_comment"
                    )
                }
            }
        }
    }

    private findMatchingParen(text: string, openIndex: number): number {
        let depth = 0
        for (let i = openIndex; i < text.length; i++) {
            if (text[i] === '(') depth++
            else if (text[i] === ')') {
                depth--
                if (depth === 0) return i
            }
        }
        return -1
    }

    private checkCommentedOutCode(text: string, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const config = vscode.workspace.getConfiguration('Hive-Formatter')
        const thresholdLines = config.get<number>('lint.commented_out_code_threshold_lines', 3)

        const blockCommentPattern = /\/\*([\s\S]*?)\*\//g
        let match
        while ((match = blockCommentPattern.exec(text)) !== null) {
            const content = match[1]
            if (/sql-formatter-disable|sql-formatter-enable/i.test(content)) continue
            if (/^(?:\s*--\s*)?(?:示例|Example|说明|Description|Note|注意)/im.test(content)) continue

            const lines = content.split('\n').filter(l => l.trim().length > 0)
            if (lines.length < thresholdLines) continue

            const sqlKeywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'GROUP BY', 'ORDER BY', 'HAVING', 'UNION']
            let keywordCount = 0
            for (const kw of sqlKeywords) {
                if (new RegExp(`\\b${kw}\\b`, 'i').test(content)) keywordCount++
            }
            if (keywordCount < 3) continue

            this.addDiagnostic(
                text, document, diagnostics,
                match.index, 2,
                `发现注释掉的代码（${lines.length}行），建议确认后删除或取消注释`,
                "commented_out_code"
            )
        }

        const lineCommentGroups = this.findConsecutiveLineComments(text, document)
        for (const group of lineCommentGroups) {
            if (group.lineCount < thresholdLines) continue
            const content = group.text
            if (/sql-formatter-disable|sql-formatter-enable/i.test(content)) continue

            const sqlKeywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'GROUP BY', 'ORDER BY', 'HAVING', 'UNION']
            let keywordCount = 0
            for (const kw of sqlKeywords) {
                if (new RegExp(`\\b${kw}\\b`, 'i').test(content)) keywordCount++
            }
            if (keywordCount < 3) continue

            this.addDiagnostic(
                text, document, diagnostics,
                group.startIndex, 2,
                `发现注释掉的代码（${group.lineCount}行），建议确认后删除或取消注释`,
                "commented_out_code"
            )
        }
    }

    private findConsecutiveLineComments(text: string, document: vscode.TextDocument): { startIndex: number; lineCount: number; text: string }[] {
        const groups: { startIndex: number; lineCount: number; text: string }[] = []
        const lines = text.split('\n')
        let groupStart = -1
        let groupText = ''
        let groupStartIndex = 0

        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim()
            if (trimmed.startsWith('--')) {
                if (groupStart === -1) {
                    groupStart = i
                    groupStartIndex = text.indexOf(lines[i])
                    groupText = trimmed
                } else {
                    groupText += '\n' + trimmed
                }
            } else if (trimmed.length > 0) {
                if (groupStart !== -1) {
                    groups.push({ startIndex: groupStartIndex, lineCount: i - groupStart, text: groupText })
                    groupStart = -1
                    groupText = ''
                }
            }
        }
        if (groupStart !== -1) {
            groups.push({ startIndex: groupStartIndex, lineCount: lines.length - groupStart, text: groupText })
        }
        return groups
    }

    private checkExpiredTodo(text: string, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const config = vscode.workspace.getConfiguration('Hive-Formatter')
        const gracePeriod = config.get<number>('lint.expired_todo_grace_period_days', 7)

        const todoPattern = new RegExp('--\\s*(TODO|FIXME)\\s*[\\(\uff08]([^)\uff09,\uff0c]*?[,\\uff0c]?\\s*(\\d{4}[-/]\\d{2}[-/]\\d{2})\\s*[\\)\uff09]:?\\s*.*', 'gi')
        let match
        while ((match = todoPattern.exec(text)) !== null) {
            const dateStr = match[3].replace(/\//g, '-')
            const todoDate = new Date(dateStr)
            const now = new Date()
            now.setHours(0, 0, 0, 0)

            if (isNaN(todoDate.getTime())) continue

            const diffMs = now.getTime() - todoDate.getTime()
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

            if (diffDays <= gracePeriod) continue

            this.addDiagnostic(
                text, document, diagnostics,
                match.index, match[0].length,
                `TODO 标记已过期（${dateStr}），已超期 ${diffDays} 天，请确认是否仍需处理`,
                "expired_todo"
            )
        }

        const deadlinePattern = /--\s*(TODO|FIXME)[^\n]*@deadline\s+(\d{4}[-/]\d{2}[-/]\d{2})/gi
        while ((match = deadlinePattern.exec(text)) !== null) {
            const dateStr = match[2].replace(/\//g, '-')
            const todoDate = new Date(dateStr)
            const now = new Date()
            now.setHours(0, 0, 0, 0)

            if (isNaN(todoDate.getTime())) continue

            const diffMs = now.getTime() - todoDate.getTime()
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

            if (diffDays <= gracePeriod) continue

            this.addDiagnostic(
                text, document, diagnostics,
                match.index, match[0].length,
                `TODO 标记已过期（${dateStr}），已超期 ${diffDays} 天，请确认是否仍需处理`,
                "expired_todo"
            )
        }
    }
}
