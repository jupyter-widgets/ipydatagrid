from pathlib import Path
from setuptools import setup

from jupyter_packaging import (
    create_cmdclass,
    install_npm,
    ensure_targets,
    combine_commands
)

HERE = Path(__file__).absolute().parent
JS_DIR = HERE / 'src'

# Representative files that should exist after a successful build
jstargets = [JS_DIR /  'dist' / 'index.js']

package_data_spec = {
    name: [
        'nbextension/*.*js*',
        'labextension/*'
    ]
}

data_files_spec = [
    ('share/jupyter/nbextensions/ipydatagrid', 'ipydatagrid/nbextension', '**'),
    ('share/jupyter/labextensions/ipydatagrid', 'ipydatagrid/labextension', "**"),
    ('etc/jupyter/nbconfig/notebook.d', '.', 'ipydatagrid.json'),
]

cmdclass = create_cmdclass('jsdeps', package_data_spec=package_data_spec, data_files_spec=data_files_spec)
cmdclass['jsdeps'] = combine_commands(
    install_npm(JS_DIR, build_cmd='build', npm=['npm', '--legacy-peer-deps'])
    ensure_targets(jstargets)
)

# See setup.cfg for other parameters
setup(cmdclass=cmdclass)
