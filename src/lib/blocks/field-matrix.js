import ScratchBlocks from 'scratch-blocks';

export default class FieldMatrix extends ScratchBlocks.FieldMatrix {
    static get MIN_ROWS () {
        return 3;
    }

    static get MAX_ROWS () {
        return 9;
    }

    static get DEFAULT_ROWS () {
        return 5;
    }

    static get MIN_COLS () {
        return 3;
    }

    static get MAX_COLS () {
        return 17;
    }

    static get DEFAULT_COLS () {
        return 5;
    }

    get ZEROS () {
        return '0'.repeat(this.rows * this.cols);
    }

    get ONES () {
        return '1'.repeat(this.rows * this.cols);
    }

    get THUMBNAIL_WIDTH () {
        const nodeSize = (ScratchBlocks.FieldMatrix.THUMBNAIL_NODE_SIZE * 5) / this.rows;
        const nodePad = (ScratchBlocks.FieldMatrix.THUMBNAIL_NODE_PAD * 4) / (this.rows - 1);
        return (nodeSize + nodePad) * this.cols;
    }

    constructor (matrix) {
        super(matrix);

        // default 5 x 5 matrix of cells
        this.rows = FieldMatrix.DEFAULT_ROWS;
        this.cols = FieldMatrix.DEFAULT_COLS;
    }

    setMatrixSize (rows, cols) {
        rows = rows || FieldMatrix.DEFAULT_ROWS;
        if (rows < FieldMatrix.MIN_ROWS) {
            rows = FieldMatrix.MIN_ROWS;
        }
        if (rows > FieldMatrix.MAX_ROWS) {
            rows = FieldMatrix.MAX_ROWS;
        }
        cols = cols || FieldMatrix.DEFAULT_COLS;
        if (cols < FieldMatrix.MIN_COLS) {
            cols = FieldMatrix.MIN_COLS;
        }
        if (cols > FieldMatrix.MAX_COLS) {
            cols = FieldMatrix.MAX_COLS;
        }
        if (this.rows !== rows || this.rows !== cols) {
            this.rows = rows;
            this.cols = cols;
            this.init();
        }
    }

    init () {
        if (this.fieldGroup_) {
            // Matrix menu has already been initialized once.
            return;
        }

        // Build the DOM.
        this.fieldGroup_ = ScratchBlocks.utils.createSvgElement('g', {}, null);

        const nodeSize = (ScratchBlocks.FieldMatrix.THUMBNAIL_NODE_SIZE * 5) / this.rows;
        this.size_.width =
            this.THUMBNAIL_WIDTH +
            ScratchBlocks.FieldMatrix.ARROW_SIZE +
            (ScratchBlocks.BlockSvg.DROPDOWN_ARROW_PADDING * 1.5);

        this.sourceBlock_.getSvgRoot().appendChild(this.fieldGroup_);

        const thumbX = ScratchBlocks.BlockSvg.DROPDOWN_ARROW_PADDING / 2;
        const thumbY = (this.size_.height - ScratchBlocks.FieldMatrix.THUMBNAIL_SIZE) / 2;
        const thumbnail = ScratchBlocks.utils.createSvgElement(
            'g',
            {
                'transform': `translate(${thumbX}, ${thumbY})`,
                'pointer-events': 'bounding-box',
                'cursor': 'pointer'
            },
            this.fieldGroup_
        );
        this.ledThumbNodes_ = [];
        const nodePad = (ScratchBlocks.FieldMatrix.THUMBNAIL_NODE_PAD * 4) / (this.rows - 1);
        for (let i = 0; i < this.rows; i++) {
            for (let n = 0; n < this.cols; n++) {
                const attr = {
                    x: ((nodeSize + nodePad) * n) + nodePad,
                    y: ((nodeSize + nodePad) * i) + nodePad,
                    width: nodeSize,
                    height: nodeSize,
                    rx: nodePad,
                    ry: nodePad
                };
                this.ledThumbNodes_.push(
                    ScratchBlocks.utils.createSvgElement(
                        'rect',
                        attr,
                        thumbnail
                    )
                );
            }
            thumbnail.style.cursor = 'default';
            this.updateMatrix_();
        }

        if (!this.arrow_) {
            const arrowX =
                this.THUMBNAIL_WIDTH +
                (ScratchBlocks.BlockSvg.DROPDOWN_ARROW_PADDING * 1.5);
            const arrowY = (this.size_.height - ScratchBlocks.FieldMatrix.ARROW_SIZE) / 2;
            this.arrow_ = ScratchBlocks.utils.createSvgElement(
                'image',
                {
                    height: `${ScratchBlocks.FieldMatrix.ARROW_SIZE}px`,
                    width: `${ScratchBlocks.FieldMatrix.ARROW_SIZE}px`,
                    transform: `translate(${arrowX}, ${arrowY})`
                },
                this.fieldGroup_
            );
            this.arrow_.setAttributeNS(
                'http://www.w3.org/1999/xlink',
                'xlink:href',
                `${ScratchBlocks.mainWorkspace.options.pathToMedia}dropdown-arrow.svg`
            );
            this.arrow_.style.cursor = 'default';
        }

        this.mouseDownWrapper_ = ScratchBlocks.bindEventWithChecks_(
            this.getClickTarget_(),
            'mousedown',
            this,
            this.onMouseDown_
        );
    }

    setValue (matrix) {
        if (!matrix) {
            return;
        }
        if (!matrix.includes(':')) {
            const image = [];
            for (let i = 0; i < this.rows; i++) {
                image.push(matrix.slice(i * this.cols, (i + 1) * this.cols));
            }
            matrix = image.join(':');
        } else if (!this.matrix_) {
            // set matrix rows and cols
            const rows = matrix.split(':');
            this.setMatrixSize(rows.length, rows[0].length);
        }
        if (matrix === this.matrix_) {
            return; // No change
        }
        if (this.sourceBlock_ && ScratchBlocks.Events.isEnabled()) {
            ScratchBlocks.Events.fire(new ScratchBlocks.Events.Change(
                this.sourceBlock_, 'field', this.name, this.matrix_, matrix));
        }
        const length = this.ZEROS.length;
        matrix = matrix + this.ZEROS.substring(0, length - matrix.length);
        this.matrix_ = matrix;
        this.updateMatrix_();
    }

    showEditor_ () {
        // If there is an existing drop-down someone else owns, hide it immediately and clear it.
        ScratchBlocks.DropDownDiv.hideWithoutAnimation();
        ScratchBlocks.DropDownDiv.clearContent();
        const div = ScratchBlocks.DropDownDiv.getContentDiv();
        // Build the SVG DOM.
        const matrixHeight =
            (ScratchBlocks.FieldMatrix.MATRIX_NODE_SIZE * this.rows) +
            (ScratchBlocks.FieldMatrix.MATRIX_NODE_PAD * (this.rows + 1));
        const matrixWidth =
            (ScratchBlocks.FieldMatrix.MATRIX_NODE_SIZE * this.cols) +
            (ScratchBlocks.FieldMatrix.MATRIX_NODE_PAD * (this.cols + 1));
        this.matrixStage_ = ScratchBlocks.utils.createSvgElement(
            'svg',
            {
                'xmlns': 'http://www.w3.org/2000/svg',
                'xmlns:html': 'http://www.w3.org/1999/xhtml',
                'xmlns:xlink': 'http://www.w3.org/1999/xlink',
                'version': '1.1',
                'height': `${matrixHeight}px`,
                'width': `${matrixWidth}px`
            },
            div
        );
        // Create the ?x? matrix
        this.ledButtons_ = [];
        for (let i = 0; i < this.rows; i++) {
            for (let n = 0; n < this.cols; n++) {
                const x =
                    (ScratchBlocks.FieldMatrix.MATRIX_NODE_SIZE * n) +
                    (ScratchBlocks.FieldMatrix.MATRIX_NODE_PAD * (n + 1));
                const y =
                    (ScratchBlocks.FieldMatrix.MATRIX_NODE_SIZE * i) +
                    (ScratchBlocks.FieldMatrix.MATRIX_NODE_PAD * (i + 1));
                const attr = {
                    x: `${x}px`,
                    y: `${y}px`,
                    width: ScratchBlocks.FieldMatrix.MATRIX_NODE_SIZE,
                    height: ScratchBlocks.FieldMatrix.MATRIX_NODE_SIZE,
                    rx: ScratchBlocks.FieldMatrix.MATRIX_NODE_RADIUS,
                    ry: ScratchBlocks.FieldMatrix.MATRIX_NODE_RADIUS
                };
                const led = ScratchBlocks.utils.createSvgElement(
                    'rect',
                    attr,
                    this.matrixStage_
                );
                this.matrixStage_.appendChild(led);
                this.ledButtons_.push(led);
            }
        }
        // Div for lower button menu
        const buttonDiv = document.createElement('div');
        // Button to clear matrix
        const clearButtonDiv = document.createElement('div');
        clearButtonDiv.className = 'scratchMatrixButtonDiv';
        const clearButton = this.createButton_(
            this.sourceBlock_.colourSecondary_
        );
        clearButtonDiv.appendChild(clearButton);
        // Button to fill matrix
        const fillButtonDiv = document.createElement('div');
        fillButtonDiv.className = 'scratchMatrixButtonDiv';
        const fillButton = this.createButton_('#FFFFFF');
        fillButtonDiv.appendChild(fillButton);

        buttonDiv.appendChild(clearButtonDiv);
        buttonDiv.appendChild(fillButtonDiv);
        div.appendChild(buttonDiv);

        ScratchBlocks.DropDownDiv.setColour(
            this.sourceBlock_.getColour(),
            this.sourceBlock_.getColourTertiary()
        );
        ScratchBlocks.DropDownDiv.setCategory(this.sourceBlock_.getCategory());
        ScratchBlocks.DropDownDiv.showPositionedByBlock(this, this.sourceBlock_);

        this.matrixTouchWrapper_ = ScratchBlocks.bindEvent_(
            this.matrixStage_,
            'mousedown',
            this,
            this.onMouseDown
        );
        this.clearButtonWrapper_ = ScratchBlocks.bindEvent_(
            clearButton,
            'click',
            this,
            this.clearMatrix_
        );
        this.fillButtonWrapper_ = ScratchBlocks.bindEvent_(
            fillButton,
            'click',
            this,
            this.fillMatrix_
        );

        // Update the matrix for the current value
        this.updateMatrix_();
    }

    clearMatrix_ (e) {
        if (e.button !== 0) return;
        this.setValue(this.ZEROS);
    }

    fillMatrix_ (e) {
        if (e.button !== 0) return;
        this.setValue(this.ONES);
    }


    setLEDNode_ (led, state) {
        const leds = this.matrix_.length;
        if (led < 0 || led > leds - 1) return;
        const matrix = this.matrix_.substring(0, led) + state + this.matrix_.substring(led + 1);
        this.setValue(matrix);
    }

    fillLEDNode_ (led) {
        const leds = this.matrix_.length;
        if (led < 0 || led > leds - 1) return;
        this.setLEDNode_(led, '1');
    }

    clearLEDNode_ (led) {
        const leds = this.matrix_.length;
        if (led < 0 || led > leds - 1) return;
        this.setLEDNode_(led, '0');
    }

    toggleLEDNode_ (led) {
        const leds = this.matrix_.length;
        if (led < 0 || led > leds - 1) return;
        if (this.matrix_.charAt(led) === '0') {
            this.setLEDNode_(led, '1');
        } else {
            this.setLEDNode_(led, '0');
        }
    }

    checkForLED_ (e) {
        const bBox = this.matrixStage_.getBoundingClientRect();
        const nodeSize = ScratchBlocks.FieldMatrix.MATRIX_NODE_SIZE;
        const nodePad = ScratchBlocks.FieldMatrix.MATRIX_NODE_PAD;
        const dx = e.clientX - bBox.left;
        const dy = e.clientY - bBox.top;
        const min = nodePad / 2;
        const maxWidth = bBox.width - (nodePad / 2);
        const maxHeight = bBox.height - (nodePad / 2);
        if (dx < min || dx > maxWidth || dy < min || dy > maxHeight) {
            return -1;
        }
        const xDiv = Math.trunc((dx - (nodePad / 2)) / (nodeSize + nodePad));
        const yDiv = Math.trunc((dy - (nodePad / 2)) / (nodeSize + nodePad));
        return (xDiv + yDiv) + (yDiv * this.cols);
    }

    updateMatrix_ () {
        const matrix = this.matrix_.replace(/:/g, '');
        for (let i = 0; i < matrix.length; i++) {
            if (matrix[i] === '0') {
                this.fillMatrixNode_(this.ledButtons_, i, this.sourceBlock_.colourSecondary_);
                this.fillMatrixNode_(this.ledThumbNodes_, i, this.sourceBlock_.colour_);
            } else {
                this.fillMatrixNode_(this.ledButtons_, i, '#FFFFFF');
                this.fillMatrixNode_(this.ledThumbNodes_, i, '#FFFFFF');
            }
        }
    }
}
