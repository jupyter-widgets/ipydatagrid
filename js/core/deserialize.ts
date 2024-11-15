import { Dict } from '@jupyter-widgets/base';
import { array_or_json_serializer } from 'bqplot';
import { DataSource } from '../datasource';

export function unpack_raw_data(
  value: any | Dict<unknown> | string | (Dict<unknown> | string)[],
): any {
  if (Array.isArray(value)) {
    const unpacked: any[] = [];
    value.forEach((sub_value, key) => {
      unpacked.push(unpack_raw_data(sub_value));
    });
    return unpacked;
  } else if (value instanceof Object && typeof value !== 'string') {
    const unpacked: { [key: string]: any } = {};
    Object.keys(value).forEach((key) => {
      unpacked[key] = unpack_raw_data(value[key]);
    });
    return unpacked;
  } else if (value === '$NaN$') {
    return Number.NaN;
  } else if (value === '$Infinity$') {
    return Number.POSITIVE_INFINITY;
  } else if (value === '$NegInfinity$') {
    return Number.NEGATIVE_INFINITY;
  } else if (value === '$NaT$') {
    return new Date('INVALID');
  } else {
    return value;
  }
}

export function deserialize_data_simple(data: any, manager: any): any {
  const deserialized_data: any = {};

  // Backward compatibility for when data.data was an array of rows
  // (should be removed in ipydatagrid 2.x?)
  if (Array.isArray(data.data)) {
    if (data.data.length === 0) {
      return deserialized_data;
    }

    const unpacked = unpack_raw_data(data.data);
    // Turn array of rows (old approach) into a dictionary of columns as arrays (new approach)
    for (const column of Object.keys(unpacked[0])) {
      const columnData = new Array(unpacked.length);
      let rowIdx = 0;

      for (const row of unpacked) {
        columnData[rowIdx++] = row[column];
      }

      deserialized_data[column] = columnData;
    }

    return deserialized_data;
  }

  for (const column of Object.keys(data.data)) {
    deserialized_data[column] = [];

    if (Array.isArray(data.data[column])) {
      deserialized_data[column] = data.data[column];
      continue;
    }

    if (data.data[column].type == 'raw') {
      deserialized_data[column] = unpack_raw_data(data.data[column].value);
    } else {
      if (data.data[column].value.length !== 0) {
        let deserialized_array = array_or_json_serializer.deserialize(
          data.data[column],
          manager,
        );

        // Turning back float32 dates into isoformat
        if (deserialized_array.type === 'date') {
          const float32Array = deserialized_array;
          deserialized_array = [];

          for (let i = 0; i < float32Array.length; i++) {
            deserialized_array[i] = new Date(float32Array[i]).toISOString();
          }
        }

        deserialized_data[column] = deserialized_array;
      }
    }
  }
  return deserialized_data
}

export function deserialize_data(data: any, manager: any): DataSource {
  const deserialized = deserialize_data_simple(data, manager);
  return new DataSource(deserialized, data.fields, data.schema, true);
}
