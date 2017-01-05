// CONVERT STYLESHEET INTO ARRAY

var stylesheets = document.getElementsByTagName('style');

for (var i = 0; i < stylesheets.length; i++) {

    var stylesheet = stylesheets[i].textContent;
    stylesheet = stylesheet.replace(/\n/g,' ');
    stylesheet = stylesheet.replace(/\/\*.*?\*\//g,'');
    stylesheet = stylesheet.replace(/[\s]*{/g,'{');
    stylesheet = stylesheet.replace(/[\s]*}/g,'}');
    stylesheet = stylesheet.replace(/{[\s]*/g,'{');
    stylesheet = stylesheet.replace(/}[\s]*/g,'}');

    var stylesheet = stylesheet.split(/{|}|;/);
    var stylesheetRules = [];
    var ruleIndex = 0;

    for (var j = 0; j < stylesheet.length; j++) {

        if (!stylesheet[j].match(/(^$|^\s+$)/g)) {

            if (!stylesheet[j].match(/\:/g) ||
                 stylesheet[j].match(/\:\:/g) ||
                 stylesheet[j].match(/\:nth/g) ||
                 stylesheet[j].match(/\:first/g) ||
                 stylesheet[j].match(/\:last/g) ||
                 stylesheet[j].match(/\:link/g) ||
                 stylesheet[j].match(/\:visited/g) ||
                 stylesheet[j].match(/\:hover/g) ||
                 stylesheet[j].match(/\:active/g) ||
                 stylesheet[j].match(/\:focus/g) ||
                 stylesheet[j].match(/\:target/g)) {
                stylesheetRules[stylesheetRules.length] = ruleIndex;
                ruleIndex++;
            }

            stylesheetRules[stylesheetRules.length] = stylesheet[j].replace(/([\s]*:[\s]*)/,':').trim();
        }
    }

    console.log(stylesheetRules);

    // BUILD AXE RULES OBJECT

    var axe = {};
    axe['axeRules'] = [];
    var axeRuleIndex = 0;
    var symbols = ['<','^','%','|','?','!'];

    for (var j = 0; j < stylesheetRules.length; j++) {

        if ((typeof stylesheetRules[j] === 'number') && (stylesheetRules[(j+1)].match(/(\<|\^|\?|\!|\%|\|)/))) {

            axe.axeRules[axeRuleIndex] = {};
            var axeRule = axe.axeRules[axeRuleIndex];
            axeRule['axeIndex'] = stylesheetRules[j];

            var stone = stylesheetRules[(j+1)];
            stone = stone.replace(/(\w)\s+([\w|\.|\#])/g,'$1; ;$2');
            stone = stone.replace(/(\w)\s*?([\>|\+|\~|\<|\^|\?|\!|\%|\|])\s*?([\w|\.|\#])/g,'$1;$2;$3');
            bronze = stone.split(';');

            var iron = '';

            for (var a = 0; a < bronze.length; a++) {

                if (symbols.indexOf(bronze[a]) > -1) {
                    iron += ';' + ' ' + bronze[a] + ' ' + bronze[(a + 1)];
                    
                    if ((a < (bronze.length - 2)) && (symbols.indexOf(bronze[(a + 2)]) < 0)) {
                        iron += ';';
                    }

                    if (a < (bronze.length - 1)) {
                        a++;
                    }
                }
                    
                else if ((a === 0) || (bronze[a] === ' ') || (bronze[(a - 1)] === ' ')) {
                    iron += bronze[a];
                }

                else {
                    iron += ' ' + bronze[a];
                }
            }

            axeRule['axeSelector'] = iron.split(';');
            axeRule.axeSelector.unshift(stylesheetRules[(j+1)]);

            var k = j + 2;
            var axeStyles = {};

            while (typeof stylesheetRules[k] === 'string') {
                var property = stylesheetRules[k].substring(0,stylesheetRules[k].indexOf(':'));
                var value = stylesheetRules[k].substring((stylesheetRules[k].indexOf(':') + 1));
                axeStyles[property] = value;
                k++;
            }

            axeRule['axeStyles'] = axeStyles;

            axeRuleIndex++;
        }
    }
}

console.log(axe);

var segment = 0;
var selectorFragment = axeRule.axeSelector[1];

function nodeProperties(node) {
    var nodeProperties = {};
    
    switch (node.substring(0,1)) {
        case ('#') :
            nodeProperties['type'] = 2;
            nodeProperties['name'] = node.substring(1);
            nodeProperties['label'] = 'id';
            break;

        case ('.') :
            nodeProperties['type'] = 1;
            nodeProperties['name'] = node.substring(1);
            nodeProperties['label'] = 'className';
            break;

        default :
            nodeProperties['type'] = 0;
            nodeProperties['name'] = node.toUpperCase();
            nodeProperties['label'] = 'nodeName';
    }

    return nodeProperties;
}


function styleString(styleObject) {
    var styleString = '';

    Object.keys(styleObject).forEach(function(property){
        styleString += property + ':' + styleObject[property] + '; ';
    });
    
    return styleString;
}


function ancestorImmediate(element) {return element.parentNode;}
function siblingImmediatePrevious(element) {return element.previousElementSibling;}
function siblingImmediate(element) {return [element.previousElementSibling, element.nextElementSibling];}

function ancestorAll(element) {

    var allAncestors = [];
    var ancestor = element.parentNode;

    while (ancestor.nodeName !== 'HTML') {
        allAncestors[(allAncestors.length)] = ancestor;
        ancestor = ancestor.parentNode;
    }

    return allAncestors;
}


function siblingAllPrevious(element) {
    var s = 0;
    var allPreviousSiblings = [];

    for (var i = 0; i < element.parentNode.children.length; i++) {
        if (element.parentNode.children[i] === element) break;
        allPreviousSiblings[s] = element.parentNode.children[i];
        s++;
    }

    return allPreviousSiblings;
}


function siblingAll(element) {
    var s = 0;
    var allSiblings = [];

    for (var i = 0; i < element.parentNode.children.length; i++) {
        if (element.parentNode.children[i] === element) continue;
        allSiblings[s] = element.parentNode.children[i];
        s++;
    }

    return allSiblings;
}


function activateSymbol(symbol, node) {
    var targetElements = [];

    switch (symbol) {
        case ('<') : targetElements[0] = ancestorImmediate(node); break;
        case ('^') : targetElements = ancestorAll(node); break;
        case ('%') : targetElements = siblingImmediate(node); break;
        case ('|') : targetElements = siblingAll(node); break;
        case ('?') : targetElements[0] = siblingImmediatePrevious(node); break;
        case ('!') : targetElements = siblingAllPrevious(node); break;
    }

    return targetElements;
}


function getSelectorFragment(segment) {
    var i = 1;
    var selectorFragment = '[data-axeSelector="';

    while (i < segment) {
        selectorFragment += axeRule.axeSelector[i];
        i++;
    }

    selectorFragment += axeRule.axeSelector[i];
    i++;

    selectorFragment += '"]' + (axeRule.axeSelector[i] ? axeRule.axeSelector[i] : '');
    return selectorFragment;
}

function axeStyle(axeRule) {

    while (axeRule.axeSelector.length > (segment + 2)) {
        var newSegment = (segment + 2);
        var symbol = axeRule.axeSelector[newSegment].substring(1,2);
        var nodes = document.querySelectorAll(selectorFragment);

        var currentAttribute = '';
        for (var a = 1; a < newSegment; a++) {currentAttribute += axeRule.axeSelector[a];}
        var nextAttribute = '';
        for (var a = 1; a < (newSegment + 1); a++) {nextAttribute += axeRule.axeSelector[a];}


        for (var j = 0; j < nodes.length; j++) {
            nodes[j].setAttribute('data-axeSelector', currentAttribute);
            var node = nodes[j];
            var targetElements = activateSymbol(symbol, node);
            var needle = axeRule.axeSelector[newSegment].substring(3);

            targetElements.forEach(function(targetElement){
                if (targetElement[nodeProperties(needle).label] === nodeProperties(needle).name) {
                    targetElement.setAttribute('data-axeSelector', nextAttribute);
                }
            });
        }

        segment = newSegment;
        selectorFragment = getSelectorFragment(segment);
    }

    document.styleSheets[0].insertRule(selectorFragment + '{' + styleString(axeRule.axeStyles) + '}', axeRule.axeIndex);
}

axe.axeRules.forEach(function(axeRule){axeStyle(axeRule);});
