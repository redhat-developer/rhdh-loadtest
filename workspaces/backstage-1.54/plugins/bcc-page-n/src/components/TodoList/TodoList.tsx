import { Table, type TableColumn } from '@backstage/core-components';

export type TodoItem = {
  title: string;
  id: string;
  createdBy: string;
  createdAt: string;
};

const columns: TableColumn<TodoItem>[] = [
  {
    id: 'title',
    title: 'Title',
    field: 'title',
  },
  {
    id: 'createdBy',
    title: 'Created by',
    field: 'createdBy',
  },
  {
    id: 'createdAt',
    title: 'Created at',
    field: 'createdAt',
    type: 'datetime',
  },
];

export const TodoList = ({ todos }: { todos: TodoItem[] }) => {
  return <Table columns={columns} data={todos} />;
};
