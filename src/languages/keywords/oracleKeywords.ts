import type { KeywordInfo } from '../../hover/HoverResolver'

export const oracleKeywords: KeywordInfo[] = [
    { keyword: 'CONNECT BY', syntax: 'SELECT ... FROM table START WITH condition CONNECT BY PRIOR col = parent_col', description: '层次查询，用于处理树形结构数据', category: 'hint', example: 'SELECT employee_id, manager_id FROM employees\nSTART WITH manager_id IS NULL\nCONNECT BY PRIOR employee_id = manager_id' },
    { keyword: 'START WITH', syntax: 'START WITH condition', description: '指定层次查询的起始条件', category: 'hint' },
    { keyword: 'PIVOT', syntax: 'SELECT ... FROM table PIVOT (agg_fn(col) FOR pivot_col IN (val1, val2, ...))', description: '行转列操作', category: 'hint' },
    { keyword: 'UNPIVOT', syntax: 'SELECT ... FROM table UNPIVOT (value_col FOR name_col IN (col1, col2, ...))', description: '列转行操作', category: 'hint' },
    { keyword: 'NVL', syntax: 'NVL(expr, replacement)', description: '如果 expr 为 NULL 则返回 replacement', category: 'conditional', example: 'SELECT NVL(commission, 0) FROM employees' },
    { keyword: 'DECODE', syntax: 'DECODE(expr, search1, result1, search2, result2, ..., default)', description: '条件表达式，类似于 CASE WHEN', category: 'conditional', example: 'SELECT DECODE(dept, \'IT\', 1, \'HR\', 2, 0) FROM employees' },
    { keyword: 'ROWNUM', syntax: 'WHERE ROWNUM <= n', description: '伪列，返回结果集中的行序号', category: 'hint', example: 'SELECT * FROM employees WHERE ROWNUM <= 10' },
    { keyword: 'VARCHAR2', syntax: 'VARCHAR2(n)', description: 'Oracle 可变长度字符串类型', category: 'type' },
    { keyword: 'NUMBER', syntax: 'NUMBER(precision, scale)', description: 'Oracle 数值类型', category: 'type' },
    { keyword: 'CLOB', syntax: 'CLOB', description: 'Oracle 大字符对象类型', category: 'type' },
    { keyword: 'BLOB', syntax: 'BLOB', description: 'Oracle 大二进制对象类型', category: 'type' },
]
