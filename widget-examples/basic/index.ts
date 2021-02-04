import { FeatherGrid } from '../../js/feathergrid';

import { DockPanel, Widget, StackedPanel, BoxPanel } from '@lumino/widgets';

import { JSONModel, DataGrid, BasicSelectionModel } from '@lumino/datagrid';

import { DataGenerator } from '../../tests/js/testUtils';

import { ViewBasedJSONModel } from '../../js/core/viewbasedjsonmodel';

import './index.css';

function transformToVBJD(data: any) {
  data.schema.primaryKeyUuid = 'ipydguuid';
  for (const field of data.schema.fields) {
    field.rows = [field['name']];
  }
  let count = 0;
  for (const row of data.data) {
    row['ipydguuid'] = count++;
  }

  return data;
}

export const test_data = {
  data: [
    {
      index: 0,
      Name: 'Chevrolet',
      Origin: 'USA',
      Revenue: '$20-100 bn',
      Cylinders: [4, 8, 16],
      Horsepower: 130.0,
      Models: 2,
      Automatic: true,
      'Date in Service': '1980-01-02',
    },
    {
      index: 1,
      Name: 'BMW',
      Origin: 'Germany',
      Revenue: '$20-100 bn',
      Cylinders: [3, 6, 8, 16],
      Horsepower: 120.0,
      Models: 3,
      Automatic: true,
      'Date in Service': '1990-11-22',
    },
    {
      index: 2,
      Name: 'Mercedes',
      Origin: 'Germany',
      Revenue: '$20-100 bn',
      Cylinders: [4, 8, 16],
      Horsepower: 100.0,
      Models: 5,
      Automatic: false,
      'Date in Service': '1970-06-13',
    },
    {
      index: 3,
      Name: 'Honda',
      Origin: 'Japan',
      Revenue: '$5-20 bn',
      Cylinders: [4],
      Horsepower: 90.0,
      Models: 5,
      Automatic: true,
      'Date in Service': '1985-05-09',
    },
    {
      index: 4,
      Name: 'Toyota',
      Origin: 'Japan',
      Revenue: '$20-100 bn',
      Cylinders: [2, 3, 4, 6, 8, 16],
      Horsepower: 95.0,
      Models: 7,
      Automatic: true,
      'Date in Service': '1975-05-19',
    },
    {
      index: 5,
      Name: 'Renault',
      Origin: 'France',
      Revenue: '$1-5 bn',
      Cylinders: [2, 3, 4],
      Horsepower: 75.0,
      Models: 4,
      Automatic: false,
      'Date in Service': '1962-07-28',
    },
  ],
  schema: {
    primaryKey: ['index'],
    fields: [
      {
        name: 'index',
        type: 'integer',
      },
      {
        name: 'Name',
        type: 'string',
        constraint: {
          minLength: 2,
          maxLength: 100,
          pattern: '[a-zA-Z]',
        },
      },
      {
        name: 'Origin',
        type: 'string',
        constraint: {
          enum: 'dynamic',
        },
      },
      {
        name: 'Revenue',
        type: 'string',
        constraint: {
          enum: ['$1-5 bn', '$5-20 bn', '$20-100 bn'],
        },
      },
      {
        name: 'Cylinders',
        type: 'array',
        constraint: {
          enum: [2, 3, 4, 6, 8, 16],
        },
      },
      {
        name: 'Horsepower',
        type: 'number',
        constraint: {
          minimum: 50,
          maximum: 900,
        },
      },
      {
        name: 'Models',
        type: 'integer',
        constraint: {
          minimum: 1,
          maximum: 30,
        },
      },
      {
        name: 'Automatic',
        type: 'boolean',
      },
      {
        name: 'Date in Service',
        type: 'date',
      },
    ],
    pandas_version: '0.20.0',
  },
};

function createPanel(content: Widget, title: string): Widget {
  const panel = new StackedPanel();
  panel.addClass('content-wrapper');
  panel.addWidget(content);
  panel.title.label = title;
  return panel;
}

function main() {
  const vbjm = new ViewBasedJSONModel(transformToVBJD(test_data));
  const nestedData = DataGenerator.multiIndexCol(
    {
      data: [
        {
          name: "('year', '')",
          type: 'number',
          data: [2013, 2013, 2014, 2014],
        },
        { name: "('visit', '')", type: 'number', data: [1, 2, 1, 2] },
        {
          name: "('Bob', 'HR')",
          type: 'number',
          data: [41.0, 28.0, 42.0, 37.0],
        },
        {
          name: "('Bob', 'Temp')",
          type: 'number',
          data: [37.1, 35.2, 37.3, 39.2],
        },
        {
          name: "('Guido', 'HR')",
          type: 'number',
          data: [50.0, 35.0, 42.0, 31.0],
        },
        {
          name: "('Guido', 'Temp')",
          type: 'number',
          data: [37.7, 37.1, 37.4, 35.1],
        },
        {
          name: "('Sue', 'HR')",
          type: 'number',
          data: [23.0, 48.0, 44.0, 34.0],
        },
        {
          name: "('Sue', 'Temp')",
          type: 'number',
          data: [37.5, 37.1, 37.5, 39.0],
        },
        { name: "('ipydguuid', '')", type: 'number', data: [0, 1, 2, 3] },
      ],
      length: 4,
      primaryKeyData: ["('year', '')", "('visit', '')", "('ipydguuid', '')"],
    },
    'ipydguuid',
  );
  const nestedModel = new ViewBasedJSONModel(nestedData);

  const luminoModel = new JSONModel(test_data);
  const luminoGrid = new DataGrid();
  luminoGrid.addClass('grid-widget');
  luminoGrid.dataModel = luminoModel;
  luminoGrid.update();

  const fg = new FeatherGrid();
  fg.dataModel = vbjm;
  fg.selectionModel = new BasicSelectionModel({
    dataModel: vbjm,
    selectionMode: 'cell',
  });
  fg.baseColumnSize = 80;
  fg.baseRowSize = 30;
  fg.editable = true;

  const boxPanel = new BoxPanel();
  boxPanel.spacing = 5;
  boxPanel.addWidget(fg);
  const button = document.createElement('button');
  button.textContent = 'Toggle Theme';
  button.onclick = () => {
    fg.isLightTheme = !fg.isLightTheme;
  };

  const buttonBoxPanel = new BoxPanel();
  buttonBoxPanel.direction = 'left-to-right';
  const bw = new Widget({ node: button });
  buttonBoxPanel.addWidget(bw);
  const spacer = new Widget();
  buttonBoxPanel.addWidget(spacer);
  BoxPanel.setSizeBasis(bw, 120);
  BoxPanel.setStretch(spacer, 1);

  boxPanel.addWidget(buttonBoxPanel);
  BoxPanel.setStretch(fg, 1);
  BoxPanel.setSizeBasis(buttonBoxPanel, 25);

  const nestedGW = new FeatherGrid();
  nestedGW.dataModel = nestedModel;
  nestedGW.baseColumnSize = 80;
  nestedGW.baseRowSize = 30;

  const panel1 = createPanel(boxPanel, 'ipydatagrid widget');
  const panel2 = createPanel(luminoGrid, 'lumino datagrid');
  const panel3 = createPanel(nestedGW, 'ipydatagrid nested');

  const dock = new DockPanel();
  dock.id = 'dock';

  dock.addWidget(panel1);
  dock.addWidget(panel2, { mode: 'split-bottom', ref: panel1 });
  dock.addWidget(panel3, { mode: 'split-right', ref: panel1 });
  dock.activateWidget(panel1);

  window.onresize = () => {
    dock.update();
  };

  Widget.attach(dock, document.body);
}

window.onload = main;
