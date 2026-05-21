import type { KeywordInfo } from '../../hover/HoverResolver'

export const snowflakeKeywords: KeywordInfo[] = [
    { keyword: 'QUALIFY', syntax: 'SELECT ... FROM ... QUALIFY window_filter', description: '在窗口函数结果上过滤行', category: 'hint', example: 'SELECT name, salary,\n  ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rn\nFROM employees\nQUALIFY rn = 1' },
    { keyword: 'LATERAL FLATTEN', syntax: 'SELECT ... FROM table, LATERAL FLATTEN(input => array_col) alias', description: '将数组或 VARIANT 展开为多行', category: 'hint', example: 'SELECT id, val::STRING\nFROM raw_table,\nLATERAL FLATTEN(input => parsed:items) f' },
    { keyword: 'SAMPLE', syntax: 'FROM table SAMPLE (n ROWS | n PERCENT)', description: '对表进行随机采样', category: 'hint' },
    { keyword: 'CLONE', syntax: 'CREATE TABLE ... CLONE source_table', description: '克隆表（零拷贝）', category: 'ddl', example: 'CREATE TABLE employees_backup CLONE employees' },
    { keyword: 'UNDROP', syntax: 'UNDROP TABLE table_name', description: '恢复已删除的表（在 Time Travel 期内）', category: 'ddl' },
    { keyword: 'TIME TRAVEL', syntax: 'FROM table AT (TIMESTAMP => ts) | BEFORE (STATEMENT => id)', description: '查询历史数据（在数据保留期内）', category: 'hint' },
    { keyword: 'AT', syntax: 'FROM table AT (TIMESTAMP => timestamp)', description: '查询指定时间点的表数据', category: 'hint' },
    { keyword: 'BEFORE', syntax: 'FROM table BEFORE (STATEMENT => statement_id)', description: '查询指定语句之前状态的表数据', category: 'hint' },
]
