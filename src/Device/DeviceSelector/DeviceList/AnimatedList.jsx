/* Copyright (c) 2015 - 2017, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import React from 'react';
import { arrayOf, node, string } from 'prop-types';
import { Flipper, Flipped, spring } from 'react-flip-toolkit';
import deviceShape from '../deviceShape';

const changesOnReorder = devices => devices
    .map(device => device.serialNumber)
    .join('\n');

export const AnimatedList = ({ children, className, devices }) => (
    <Flipper
        element="ul"
        className={className}
        flipKey={changesOnReorder(devices)}
    >
        {children}
    </Flipper>
);
AnimatedList.propTypes = {
    children: node.isRequired,
    className: string.isRequired,
    devices: arrayOf(deviceShape.isRequired).isRequired,
};

const fadeInOrOut = fadeOut => (element, _, removeElement) => {
    const range = fadeOut ? [1, 0] : [0, 1];
    return (spring({
        values: {
            opacity: range,
            scale: range,
        },
        onUpdate: ({ opacity, scale }) => {
            element.style.opacity = opacity; // eslint-disable-line no-param-reassign
            element.style.transform = `scaleY(${scale})`; // eslint-disable-line no-param-reassign
        },
        onComplete: () => {
            if (fadeOut) {
                removeElement();
            }
        },
    })
    );
};

export const AnimatedItem = ({ children, itemKey }) => (
    <Flipped
        flipId={itemKey}
        onAppear={fadeInOrOut(false)}
        onExit={fadeInOrOut(true)}
    >
        <li>
            {children}
        </li>
    </Flipped>
);
AnimatedItem.propTypes = {
    itemKey: string.isRequired,
    children: node.isRequired,
};
