import React, { useEffect, useState } from 'react';
import { render, Box, Text, useApp, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { canInstallGlobal, installChromium, installGlobalPackage, lumaOnPath, LUMA_NPM_PACKAGE, npxLuma, printGlobalInstallHint, } from './lib/setup.js';
function StepHeader({ title, step, total }) {
    return React.createElement(Box, { flexDirection: 'column', marginBottom: 1 }, React.createElement(Text, { bold: true, color: 'cyan' }, 'luma-browser setup'), React.createElement(Text, { dimColor: true }, `Step ${step}/${total} · ${title}`));
}
function DonePanel({ usedGlobal }) {
    return React.createElement(Box, { flexDirection: 'column' }, React.createElement(Text, { bold: true, color: 'green' }, 'Setup complete'), React.createElement(Text, null, ' '), React.createElement(Text, { bold: true }, 'Next steps'), React.createElement(Text, null, ' • Quick test: luma-browser run examples/example.com.js'), React.createElement(Text, null, ' • Record QA: bash examples/session-demo.sh'), React.createElement(Text, null, ' • Sessions: luma session start --name demo'), React.createElement(Text, null, ' • Full help: luma --help / luma-browser --help'), React.createElement(Text, null, ' '), React.createElement(Text, { dimColor: true }, usedGlobal
        ? 'Global install — run luma-browser directly.'
        : `No global install — use npx ${LUMA_NPM_PACKAGE} …`), React.createElement(Text, null, ' '), React.createElement(Text, null, 'Agent plugins auto-update when marketplace versions change.'), React.createElement(Text, null, ' • Claude Code — /plugin marketplace add JagannathaReddy/luma-browser'), React.createElement(Text, null, ' • Cursor — install "luma-browser" from Marketplace'));
}
function InstallStep({ usedGlobal, onDone }) {
    const [message, setMessage] = useState('Installing…');
    useEffect(() => {
        if (usedGlobal) {
            const installed = installGlobalPackage();
            if (!installed) {
                printGlobalInstallHint();
                npxLuma(['install']);
                setMessage('Configured for npx.');
            }
            else {
                installChromium({ useGlobalCli: true });
                setMessage('Installed globally.');
            }
        }
        else {
            npxLuma(['install']);
            setMessage('Configured for npx.');
        }
        onDone();
    }, [usedGlobal, onDone]);
    return React.createElement(Text, null, message);
}
function Wizard({ nonInteractive }) {
    const { exit } = useApp();
    const [step, setStep] = useState(1);
    const [usedGlobal, setUsedGlobal] = useState(false);
    const globalOk = canInstallGlobal();
    const hasLuma = lumaOnPath();
    const totalSteps = 3;
    useInput((_input, key) => {
        if (key.ctrl && _input === 'c') {
            exit();
        }
    });
    useEffect(() => {
        if (!nonInteractive || step !== 1) {
            return;
        }
        if (hasLuma) {
            installChromium({ useGlobalCli: true });
            setUsedGlobal(true);
            setStep(3);
            return;
        }
        if (globalOk) {
            const installed = installGlobalPackage();
            if (installed) {
                setUsedGlobal(true);
                installChromium({ useGlobalCli: true });
            }
            else {
                npxLuma(['install']);
            }
        }
        else {
            npxLuma(['install']);
        }
        setStep(3);
    }, [nonInteractive, hasLuma, globalOk, step]);
    if (step === 3) {
        return React.createElement(Box, { flexDirection: 'column' }, React.createElement(DonePanel, { usedGlobal }));
    }
    if (step === 1) {
        if (nonInteractive) {
            return React.createElement(Text, null, 'Running non-interactive setup…');
        }
        if (hasLuma) {
            return React.createElement(Box, { flexDirection: 'column' }, React.createElement(StepHeader, { title: 'Existing install', step: 1, total: totalSteps }), React.createElement(Text, { color: 'green' }, '✓ luma-browser is already on PATH'), React.createElement(SelectInput, {
                items: [
                    { label: 'Install / upgrade Chromium only', value: 'chromium' },
                    { label: 'Reinstall global luma-browser', value: 'reinstall' },
                ],
                onSelect: (item) => {
                    if (item.value === 'reinstall') {
                        setStep(2);
                        return;
                    }
                    installChromium({ useGlobalCli: true });
                    setUsedGlobal(true);
                    setStep(3);
                },
            }));
        }
        return React.createElement(Box, { flexDirection: 'column' }, React.createElement(StepHeader, { title: 'Install method', step: 1, total: totalSteps }), !globalOk
            ? React.createElement(Text, { color: 'yellow' }, 'ℹ npm global prefix is not writable — npx is recommended.')
            : null, React.createElement(SelectInput, {
            items: [
                ...(globalOk
                    ? [{ label: 'Install globally with npm (recommended)', value: 'global' }]
                    : []),
                { label: 'Use npx (no global install)', value: 'npx' },
            ],
            onSelect: (item) => {
                setUsedGlobal(item.value === 'global');
                setStep(2);
            },
        }));
    }
    if (step === 2) {
        return React.createElement(Box, { flexDirection: 'column' }, React.createElement(StepHeader, { title: 'Install packages', step: 2, total: totalSteps }), React.createElement(InstallStep, {
            usedGlobal,
            onDone: () => setStep(3),
        }));
    }
    return null;
}
export function runWizard({ nonInteractive = false } = {}) {
    render(React.createElement(Wizard, { nonInteractive }));
}
//# sourceMappingURL=wizard.js.map