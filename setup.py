import os
from distutils import log
from setuptools import setup, find_packages

from jupyter_packaging import (
    create_cmdclass,
    install_npm,
    ensure_targets,
    combine_commands,
    get_version,
)

# the name of the package
name = 'ipydatagrid'
long_description = 'Fast Datagrid widget for the Jupyter Notebook and JupyterLab'

here = os.path.dirname(os.path.abspath(__file__))

log.set_verbosity(log.DEBUG)
log.info('setup.py entered')
log.info('$PATH=%s' % os.environ['PATH'])

# Get ipyleaflet version
version = get_version(os.path.join(name, '_version.py'))

js_dir = here

# Representative files that should exist after a successful build
jstargets = [
    os.path.join(js_dir, 'dist', 'index.js'),
]


package_data_spec = {
    name: [
        'nbextension/*.*js*',
        'labextension/*'
    ]
}

data_files_spec = [
    ('share/jupyter/nbextensions/ipydatagrid', 'ipydatagrid/nbextension', '*.*'),
    ('share/jupyter/labextensions/ipydatagrid', 'ipydatagrid/labextension', "*.*"),
    ('etc/jupyter/nbconfig/notebook.d', '.', 'ipydatagrid.json'),
]

cmdclass = create_cmdclass('jsdeps', package_data_spec=package_data_spec, data_files_spec=data_files_spec)
cmdclass['jsdeps'] = combine_commands(
    install_npm(js_dir, build_cmd='build'), ensure_targets(jstargets),
)

setup_args = dict(
    name=name,
    version=version,
    description=long_description,
    long_description=long_description,
    license='BSD',
    include_package_data=True,
    install_requires=[
        'jupyterlab_widgets>=1.0.0a6',
        'pandas>=0.25.0',
        'py2vega>=0.5.0',
        'ipywidgets>=7.5.0,<8',
        'bqplot>=0.11.6' 
    ],
    extras_require = {
        'test': [
            'pytest>=3.6',
            'pytest-cov',
            'nbval',
        ],
        'examples': [
            # Any requirements for the examples to run
        ],
        'docs': [
            'sphinx>=1.5',
            'recommonmark',
            'sphinx_rtd_theme',
            'nbsphinx>=0.2.13,<0.4.0',
            'jupyter_sphinx',
            'nbsphinx-link',
            'pytest_check_links',
            'pypandoc',
        ],
    },
    entry_points = {
    },
    packages=find_packages(),
    zip_safe=False,
    cmdclass=cmdclass,
    author          = 'Bloomberg, QuantStack',
    author_email    = '',
    url             = 'https://github.com/QuantStack/ipydatagrid',
    keywords        = ['Jupyter', 'Widgets', 'IPython'],
    classifiers     = [
        'Intended Audience :: Developers',
        'Intended Audience :: Science/Research',
        'License :: OSI Approved :: BSD License',
        'Programming Language :: Python',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.4',
        'Programming Language :: Python :: 3.5',
        'Programming Language :: Python :: 3.6',
        'Programming Language :: Python :: 3.7',
        'Framework :: Jupyter',
    ],
)

if __name__ == '__main__':
    setup(**setup_args)
