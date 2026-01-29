const { withXcodeProject } = require('@expo/config-plugins');

const withStripBitcode = (config) => {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;

    const shellScript = `
if [ -d "\${BUILT_PRODUCTS_DIR}/\${FRAMEWORKS_FOLDER_PATH}/ConnectIQ.framework" ]; then
    xcrun bitcode_strip -r "\${BUILT_PRODUCTS_DIR}/\${FRAMEWORKS_FOLDER_PATH}/ConnectIQ.framework/ConnectIQ" -o "\${BUILT_PRODUCTS_DIR}/\${FRAMEWORKS_FOLDER_PATH}/ConnectIQ.framework/ConnectIQ"
fi
`;

    xcodeProject.addBuildPhase([], 'PBXShellScriptBuildPhase', 'Strip Bitcode from ConnectIQ', null, {
      shellPath: '/bin/sh',
      shellScript,
      runOnlyForDeploymentPostprocessing: 0,
    });

    return config;
  });
};

module.exports = withStripBitcode;
